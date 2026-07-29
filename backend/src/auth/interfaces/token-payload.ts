import { UserRole } from '@prisma/client';

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: number;
  email: string;
  role: UserRole;
  tenantId: number;
  tokenType: TokenType;
  jti: string;
}
