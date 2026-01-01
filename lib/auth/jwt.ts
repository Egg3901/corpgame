import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  } else {
    console.warn('JWT_SECRET is not defined. Using insecure fallback for development.');
  }
}

if (!JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables.');
  } else {
    console.warn('JWT_REFRESH_SECRET is not defined. Using insecure fallback for development.');
  }
}

export interface TokenPayload {
  userId: number;
  email: string;
  username: string;
  is_admin?: boolean;
  [key: string]: unknown;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenType: 'refresh';
}

const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const ALGORITHM = 'HS256';

/**
 * Signs a JWT access token.
 */
export const signAccessToken = (payload: TokenPayload): string => {
  const secret = JWT_SECRET || 'fallback-secret';
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: ALGORITHM,
    issuer: 'corpgame-api',
    subject: payload.userId.toString(),
  };
  
  return jwt.sign(payload, secret, options);
};

/**
 * Signs a JWT refresh token.
 */
export const signRefreshToken = (payload: TokenPayload): string => {
  const secret = JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  const refreshPayload: RefreshTokenPayload = { ...payload, tokenType: 'refresh' };
  
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: ALGORITHM,
    issuer: 'corpgame-api',
    subject: payload.userId.toString(),
  };
  
  return jwt.sign(refreshPayload, secret, options);
};

/**
 * Verifies a JWT access token.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = JWT_SECRET || 'fallback-secret';
  const options: VerifyOptions = {
    algorithms: [ALGORITHM],
    issuer: 'corpgame-api',
  };
  
  try {
    return jwt.verify(token, secret, options) as TokenPayload;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verifies a JWT refresh token.
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const secret = JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  const options: VerifyOptions = {
    algorithms: [ALGORITHM],
    issuer: 'corpgame-api',
  };
  
  try {
    const decoded = jwt.verify(token, secret, options) as RefreshTokenPayload;
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Decodes a token without verifying signature (useful for debugging or getting expiration).
 */
export const decodeToken = (token: string): string | JwtPayload | null => {
  return jwt.decode(token);
};
