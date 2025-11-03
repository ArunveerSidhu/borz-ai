import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./auth.schema";
import { relations } from "drizzle-orm";

//chats table
export const chats = pgTable('chats', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New Chat'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    userIdIndex: index('idx_chats_user_id').on(table.userId),
    updatedAtIndex: index('idx_chats_updated_at').on(table.updatedAt),
}));


//messages table
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    role: text('role').notNull(), // 'user' or 'assistant'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    metadata: jsonb('metadata'), // For attachments, etc.
}, (table) => ({
    chatIdIdx: index('idx_messages_chat_id').on(table.chatId),
}));


//relations for chats table
export const chatsRelations = relations(chats, ({ one, many }) => ({
    user: one(users, {
        fields: [chats.userId],
        references: [users.id],
    }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
}));