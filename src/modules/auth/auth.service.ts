// import {
//   Injectable,
//   ConflictException,
//   UnauthorizedException,
//   ForbiddenException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';
// import { PrismaClient } from '@prisma/client';
// import * as argon2 from 'argon2';
// import {
//   SignUpRequest,
//   SignInRequest,
//   AuthResponse,
//   TokenPayload,
//   JwtTokens,
// } from './interfaces/auth.interface';

// @Injectable()
// export class AuthService {
//   constructor(
//     private prisma: PrismaClient,
//     private jwt: JwtService,
//     private config: ConfigService,
//   ) {}

//   async signUp(data: SignUpRequest): Promise<AuthResponse> {
//     // Check if user already exists
//     const existingUser = await this.prisma.user.findUnique({
//       where: { email: data.email },
//     });

//     if (existingUser) {
//       throw new ConflictException('User with this email already exists');
//     }

//     // Hash password
//     const hashedPassword = await argon2.hash(data.password);

//     // Create user
//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: hashedPassword,
//         name: data.name,
//       },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         avatarUrl: true,
//         createdAt: true,
//       },
//     });

//     // Generate tokens
//     const tokens = await this.generateTokens(user.id, user.email);

//     return {
//       user,
//       tokens,
//     };
//   }

//   async signIn(data: SignInRequest): Promise<AuthResponse> {
//     // Find user
//     const user = await this.prisma.user.findUnique({
//       where: { email: data.email },
//     });

//     if (!user) {
//       throw new UnauthorizedException('Invalid credentials');
//     }

//     // Verify password
//     const passwordValid = await argon2.verify(user.password, data.password);
    
//     if (!passwordValid) {
//       throw new UnauthorizedException('Invalid credentials');
//     }

//     // Generate tokens
//     const tokens = await this.generateTokens(user.id, user.email);

//     return {
//       user: {
//         id: user.id,
//         email: user.email,
//         name: user.name,
//         avatarUrl: user.avatarUrl,
//       },
//       tokens,
//     };
//   }

//   async refreshTokens(refreshToken: string): Promise<JwtTokens> {
//     try {
//       const payload = this.jwt.verify<TokenPayload>(refreshToken, {
//         secret: this.config.get<string>('JWT_REFRESH_SECRET'),
//       });

//       if (payload.type !== 'refresh') {
//         throw new ForbiddenException('Invalid token type');
//       }

//       // Verify user still exists
//       const user = await this.prisma.user.findUnique({
//         where: { id: payload.sub },
//       });

//       if (!user) {
//         throw new ForbiddenException('User not found');
//       }

//       return this.generateTokens(user.id, user.email);
//     } catch (error) {
//       throw new ForbiddenException('Invalid refresh token');
//     }
//   }

//   async logout(userId: string): Promise<{ message: string }> {
//     // In production, you'd typically blacklist the tokens or store them in Redis
//     // For now, we'll just return success
//     return { message: 'Logged out successfully' };
//   }

//   private async generateTokens(userId: string, email: string): Promise<JwtTokens> {
//     const [accessToken, refreshToken] = await Promise.all([
//       this.jwt.signAsync(
//         { sub: userId, email, type: 'access' } as TokenPayload,
//         {
//           secret: this.config.get<string>('JWT_ACCESS_SECRET'),
//           expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
//         },
//       ),
//       this.jwt.signAsync(
//         { sub: userId, email, type: 'refresh' } as TokenPayload,
//         {
//           secret: this.config.get<string>('JWT_REFRESH_SECRET'),
//           expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
//         },
//       ),
//     ]);

//     return { accessToken, refreshToken };
//   }
// }
