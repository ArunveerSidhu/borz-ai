import 'dotenv/config';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET!;
const JWT_EXPIRATION: string = process.env.JWT_EXPIRATION || '7d';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables');
}

export interface JwtPayload {
    userId: string;
    email: string;
}

export const generateToken = (payload: JwtPayload): string => {
    const options: SignOptions = { expiresIn: JWT_EXPIRATION as any };
    return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

export const generateResetToken = (userId: string): string => {
    const options: SignOptions = { expiresIn: '1h' };
    return jwt.sign({ userId, type: 'password-reset' }, JWT_SECRET, options);
}

export const verifyResetToken = (token: string): {userId: string} | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {userId: string, type?: string};
        if (decoded.type !== 'password-reset') {
            return null;
        }
        return { userId: decoded.userId };
    } catch (error) {
        return null;
    }
}