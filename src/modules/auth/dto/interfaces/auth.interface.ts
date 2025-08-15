export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}


export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendCodeRequest {
  email: string;
}