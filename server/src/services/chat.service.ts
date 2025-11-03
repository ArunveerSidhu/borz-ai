import { db } from '../db';
import { chats, messages } from '../db/schemas/chat.schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import GeminiService from './gemini.service';

export class ChatService {
  // Get all chats for a user
  static async getUserChats(userId: string) {
    const userChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
        messageCount: sql<number>`CAST(COUNT(${messages.id}) AS INTEGER)`,
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(eq(chats.userId, userId))
      .groupBy(chats.id)
      .orderBy(desc(chats.updatedAt));

    return { chats: userChats };
  }

  // Create new chat
  static async createChat(userId: string, title: string = 'New Chat') {
    const [newChat] = await db
      .insert(chats)
      .values({
        userId,
        title,
      })
      .returning();

    return {
      chat: {
        ...newChat,
        messages: [],
      },
    };
  }

  // Get chat by ID with messages
  static async getChatById(chatId: string, userId: string) {
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (!chat) {
      throw new Error('Chat not found');
    }

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    return {
      chat: {
        ...chat,
        messages: chatMessages,
      },
    };
  }

  // Send message and get AI response (non-streaming)
  static async sendMessage(chatId: string, userId: string, content: string) {
    // Verify chat ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Save user message
    const [userMessage] = await db
      .insert(messages)
      .values({
        chatId,
        content,
        role: 'user',
      })
      .returning();

    // Get conversation history (last 10 messages for context)
    const history = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt)
      .limit(10);

    // Generate AI response
    const aiResponse = await GeminiService.generateResponse(
      content,
      history.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))
    );

    // Save AI response
    const [assistantMessage] = await db
      .insert(messages)
      .values({
        chatId,
        content: aiResponse,
        role: 'assistant',
      })
      .returning();

    // Update chat timestamp and auto-generate title if needed
    const messageCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.chatId, chatId));

    if (chat.title === 'New Chat' && Number(messageCount[0].count) === 2) {
      // First message exchange, generate title
      const newTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await db
        .update(chats)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    } else {
      await db
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    }

    return {
      userMessage,
      assistantMessage,
    };
  }

  // Get message history for streaming
  static async getMessageHistory(chatId: string) {
    return await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt)
      .limit(10);
  }

  // Save assistant message after streaming
  static async saveAssistantMessage(chatId: string, content: string) {
    const [message] = await db
      .insert(messages)
      .values({
        chatId,
        content,
        role: 'assistant',
      })
      .returning();

    // Update chat timestamp
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));

    return message;
  }

  // Delete chat
  static async deleteChat(chatId: string, userId: string) {
    const result = await db
      .delete(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error('Chat not found');
    }

    return { success: true };
  }

  // Update chat title
  static async updateChat(chatId: string, userId: string, title: string) {
    const [updated] = await db
      .update(chats)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error('Chat not found');
    }

    return { chat: updated };
  }

  // Clear chat messages
  static async clearChatMessages(chatId: string, userId: string) {
    // Verify ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (!chat) {
      throw new Error('Chat not found');
    }

    await db
      .delete(messages)
      .where(eq(messages.chatId, chatId));

    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));

    return { success: true };
  }
}

