import { 
  Controller, 
  Post, 
  Body, 
  UsePipes, 
  Res, 
  Req, 
  UnauthorizedException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { signUpSchema, signInSchema, verifyEmailSchema, resendCodeSchema } from './dto/schemas/auth.schema';
import type { SignUpRequest, SignInRequest, VerifyEmailRequest, ResendCodeRequest } from './dto/interfaces/auth.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signUpSchema))
  async signUp(@Body() data: SignUpRequest) {
    try {
      const result = await this.authService.signUp(data);
      return {
        ...result,
        message: 'Account created successfully! Please check your email for verification code.',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  async verifyEmail(
    @Body() data: VerifyEmailRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.verifyEmail(data);
      
      // Set secure HTTP-only cookies after email verification
      this.setTokenCookies(response, result.tokens);
      
      return {
        user: result.user,
        message: 'Email verified successfully. You are now signed in.',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resendCodeSchema))
  async resendCode(@Body() data: ResendCodeRequest) {
    try {
      return await this.authService.resendVerificationCode(data);
    } catch (error) {
      throw error;
    }
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(signInSchema))
  async signIn(
    @Body() data: SignInRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.signIn(data);
      
      // Set secure HTTP-only cookies
      this.setTokenCookies(response, result.tokens);
      
      return {
        user: result.user,
        message: 'Signed in successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const refreshToken = request.cookies['refresh_token'];
      
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const tokens = await this.authService.refreshTokens(refreshToken);
      
      // Set new tokens in cookies
      this.setTokenCookies(response, tokens);
      
      return { message: 'Tokens refreshed successfully' };
    } catch (error) {
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.authService.logout();
      
      // Clear cookies
      this.clearTokenCookies(response);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  private setTokenCookies(response: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Access token cookie (shorter expiry)
    response.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Refresh token cookie (longer expiry)
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearTokenCookies(response: Response) {
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
  }
}
