import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";


export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const passwordResets = pgTable('password_resets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});