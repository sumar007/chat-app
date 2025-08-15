import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  SignUpRequest,
  SignInRequest,
  AuthResponse,
  TokenPayload,
  JwtTokens,
  VerifyEmailRequest,
  ResendCodeRequest,
} from './dto/interfaces/auth.interface';
import { EmailService } from '../../common/services/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessExpiry: string;
  private readonly jwtRefreshExpiry: string;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException('JWT secrets are required in environment variables');
    }

    this.jwtAccessSecret = accessSecret;
    this.jwtRefreshSecret = refreshSecret;
    this.jwtAccessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m';
    this.jwtRefreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY') ?? '7d';
  }

  async signUp(data: SignUpRequest): Promise<{ message: string; email: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);
      
      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Create user (unverified)
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          emailVerificationCode: verificationCode,
          emailVerificationExpiry: expiryTime,
          isEmailVerified: false,
        },
      });

      // Send verification email
      try {
        await this.emailService.sendVerificationEmail(
          user.email,
          verificationCode,
          user.name
        );
      } catch (emailError) {
        // If email fails, still return success but log the error
        console.error('Failed to send verification email:', emailError);
        // Optionally, you could delete the user or mark email as failed
      }

      return {
        message: 'Account created successfully! Please check your email for verification code.',
        email: user.email,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Signup error:', error);
      throw new InternalServerErrorException('Failed to create account');
    }
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.isEmailVerified) {
        throw new ConflictException('Email is already verified');
      }

      if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
        throw new BadRequestException('No verification code found. Please request a new one.');
      }

      if (new Date() > user.emailVerificationExpiry) {
        throw new UnauthorizedException('Verification code has expired. Please request a new one.');
      }

      if (user.emailVerificationCode !== data.code) {
        throw new UnauthorizedException('Invalid verification code');
      }

      // Mark email as verified
      const verifiedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpiry: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(verifiedUser.id, verifiedUser.email);

      return {
        user: verifiedUser,
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }
      console.error('Email verification error:', error);
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  async resendVerificationCode(data: ResendCodeRequest): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.isEmailVerified) {
        throw new ConflictException('Email is already verified');
      }

      // Generate new code
      const verificationCode = this.generateVerificationCode();
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

      // Update user with new code
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationCode: verificationCode,
          emailVerificationExpiry: expiryTime,
        },
      });

      // Send email
      try {
        await this.emailService.sendVerificationEmail(
          user.email,
          verificationCode,
          user.name
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        throw new InternalServerErrorException('Failed to send verification email');
      }

      return {
        message: 'New verification code sent to your email',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || 
          error instanceof ConflictException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Resend code error:', error);
      throw new InternalServerErrorException('Failed to resend verification code');
    }
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw new ForbiddenException('Please verify your email before signing in');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(data.password, user.password);
      
      if (!passwordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Sign in error:', error);
      throw new InternalServerErrorException('Failed to sign in');
    }
  }

  async refreshTokens(refreshToken: string): Promise<JwtTokens> {
    try {
      const payload = this.jwt.verify<TokenPayload>(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new ForbiddenException('Invalid token type');
      }

      // Verify user still exists and is verified
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      if (!user.isEmailVerified) {
        throw new ForbiddenException('Email not verified');
      }

      return this.generateTokens(user.id, user.email);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Refresh token error:', error);
      throw new ForbiddenException('Invalid refresh token');
    }
  }

  async logout(): Promise<{ message: string }> {
    return { message: 'Logged out successfully' };
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async generateTokens(userId: string, email: string): Promise<JwtTokens> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwt.signAsync(
          { sub: userId, email, type: 'access' } as TokenPayload,
          {
            secret: this.jwtAccessSecret,
            expiresIn: this.jwtAccessExpiry,
          },
        ),
        this.jwt.signAsync(
          { sub: userId, email, type: 'refresh' } as TokenPayload,
          {
            secret: this.jwtRefreshSecret,
            expiresIn: this.jwtRefreshExpiry,
          },
        ),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Token generation error:', error);
      throw new InternalServerErrorException('Failed to generate tokens');
    }
  }
}
