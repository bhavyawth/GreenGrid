import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    secret === 'your-secret-key-123' ||
    secret === 'your-secret-key-change-in-production'
  ) {
    throw new Error('JWT_SECRET must be configured with a non-placeholder value of at least 32 characters.');
  }
  return secret;
}

export const generateToken = (userId: string) => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '24h' });
};

export const verifyToken = (token: string) => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as { userId?: unknown };
    return typeof decoded.userId === 'string' && decoded.userId ? decoded.userId : null;
  } catch {
    return null;
  }
};

export function getUserIdFromAuthorizationHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match ? verifyToken(match[1]) : null;
}
