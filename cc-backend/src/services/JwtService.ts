import { AUTH_CONFIG } from '../config/auth';
import { UserRole } from '../entities/UserEntity';
import crypto from 'crypto';

export interface JwtPayload {
  userId: string;
  discordId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export class JwtService {
  generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 30 * 24 * 60 * 60; // 30 days

    const jwtPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: exp,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));

    const signature = this.generateSignature(
      `${encodedHeader}.${encodedPayload}`
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      const [headerB64, payloadB64, signatureB64] = token.split('.');

      if (!headerB64 || !payloadB64 || !signatureB64) {
        return null;
      }

      const expectedSignature = this.generateSignature(
        `${headerB64}.${payloadB64}`
      );
      if (signatureB64 !== expectedSignature) {
        return null;
      }

      const payload: JwtPayload = JSON.parse(this.base64UrlDecode(payloadB64));

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private base64UrlDecode(str: string): string {
    const padding = '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return Buffer.from(base64, 'base64').toString();
  }

  private generateSignature(data: string): string {
    return crypto
      .createHmac('sha256', AUTH_CONFIG.JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
