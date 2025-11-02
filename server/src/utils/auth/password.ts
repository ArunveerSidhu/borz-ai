import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);  // Optimized from 12 to 10 for better performance
    return await bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hashedPassword: string) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const validatePassword = (password: string) => {
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        throw new Error('Password must contain at least one special character');
    }
    return true;
}