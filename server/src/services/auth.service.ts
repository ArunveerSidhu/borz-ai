import { db } from '../db';
import { users, passwordResets } from '../db/schemas/auth.schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../utils/auth/password';
import { generateToken, generateResetToken, verifyResetToken } from '../utils/auth/jwt';
import { SignupInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../utils/auth/validation';

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signup(input: SignupInput) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
      })
      .returning();

    const user = newUser[0];

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  }

  /**
   * Login user
   */
  static async login(input: LoginInput) {
    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResult[0];

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  }

  /**
   * Request password reset
   */
  static async forgotPassword(input: ForgotPasswordInput) {
    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (userResult.length === 0) {
      // For security, don't reveal if email exists
      return { success: true };
    }

    const user = userResult[0];

    // Generate reset token
    const resetToken = generateResetToken(user.id);

    // Store reset token (expires in 1 hour)
    await db.insert(passwordResets).values({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    // TODO: Send email with reset link
    // For now, return token (in production, send via email)
    return {
      success: true,
      resetToken, // Remove this in production, send via email instead
    };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(input: ResetPasswordInput) {
    // Verify reset token
    const decoded = verifyResetToken(input.token);

    if (!decoded) {
      throw new Error('Invalid or expired reset token');
    }

    // Find password reset record
    const resetRecord = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.token, input.token),
          eq(passwordResets.used, false)
        )
      )
      .limit(1);

    if (resetRecord.length === 0 || resetRecord[0].expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(input.password);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, decoded.userId));

    // Mark reset token as used
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, resetRecord[0].id));

    return { success: true };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    };
  }
}