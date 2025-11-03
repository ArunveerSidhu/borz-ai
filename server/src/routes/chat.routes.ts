import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { authMiddleware } from '../middlewares/auth.middleware';
import { ChatService } from '../services/chat.service';
import GeminiService from '../services/gemini.service';
import { z } from 'zod';
import type { AuthContext } from '../types/hono.types';
import { db } from '../db';
import { chats, messages } from '../db/schemas/chat.schema';
import { and, eq } from 'drizzle-orm';

const chatRoutes = new Hono();

// All routes require authentication
chatRoutes.use('*', authMiddleware);

/**
 * GET /api/chats
 * Get all chats for authenticated user
 */
chatRoutes.get('/', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const result = await ChatService.getUserChats(userId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch chats' 
    }, 500);
  }
});

/**
 * POST /api/chats
 * Create a new chat
 */
chatRoutes.post('/', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const title = body.title || 'New Chat';
    
    const result = await ChatService.createChat(userId, title);
    return c.json(result, 201);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to create chat' 
    }, 500);
  }
});

/**
 * GET /api/chats/:chatId
 * Get specific chat with messages
 */
chatRoutes.get('/:chatId', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const chatId = c.req.param('chatId');
    
    const result = await ChatService.getChatById(chatId, userId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch chat' 
    }, error instanceof Error && error.message === 'Chat not found' ? 404 : 500);
  }
});

/**
 * POST /api/chats/:chatId/messages
 * Send message and get AI response (with streaming)
 */
chatRoutes.post('/:chatId/messages', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const chatId = c.req.param('chatId');
    const body = await c.req.json();
    
    const messageSchema = z.object({
      content: z.string().min(1).max(10000),
    });
    
    const { content } = messageSchema.parse(body);

    // Verify chat ownership
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (!chat) {
      return c.json({ error: 'Chat not found' }, 404);
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

    // Update chat title if it's the first message
    const messageCount = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId));

    if (chat.title === 'New Chat' && messageCount.length === 1) {
      const newTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await db
        .update(chats)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    }

    // Get conversation history
    const history = await ChatService.getMessageHistory(chatId);

    // Stream AI response
    return stream(c, async (stream) => {
      let fullResponse = '';
      
      try {
        const generator = GeminiService.generateStreamingResponse(
          content,
          history.map(msg => ({ role: msg.role, content: msg.content }))
        );

        for await (const chunk of generator) {
          fullResponse += chunk;
          await stream.write(chunk);
        }

        // Save the complete response
        await ChatService.saveAssistantMessage(chatId, fullResponse);
        
      } catch (error) {
        console.error('Streaming error:', error);
        await stream.write('\n[Error: Failed to generate response]');
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.issues }, 400);
    }
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to send message' 
    }, 500);
  }
});

/**
 * PATCH /api/chats/:chatId
 * Update chat (title)
 */
chatRoutes.patch('/:chatId', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const chatId = c.req.param('chatId');
    const body = await c.req.json();
    
    const updateSchema = z.object({
      title: z.string().min(1).max(255),
    });
    
    const { title } = updateSchema.parse(body);
    
    const result = await ChatService.updateChat(chatId, userId, title);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.issues }, 400);
    }
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to update chat' 
    }, error instanceof Error && error.message === 'Chat not found' ? 404 : 500);
  }
});

/**
 * DELETE /api/chats/:chatId
 * Delete chat
 */
chatRoutes.delete('/:chatId', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const chatId = c.req.param('chatId');
    
    const result = await ChatService.deleteChat(chatId, userId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete chat' 
    }, error instanceof Error && error.message === 'Chat not found' ? 404 : 500);
  }
});

/**
 * DELETE /api/chats/:chatId/messages
 * Clear all messages in a chat
 */
chatRoutes.delete('/:chatId/messages', async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const chatId = c.req.param('chatId');
    
    const result = await ChatService.clearChatMessages(chatId, userId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to clear messages' 
    }, error instanceof Error && error.message === 'Chat not found' ? 404 : 500);
  }
});

export default chatRoutes;

