import { Server as SocketIOServer } from 'socket.io';
import type { ServerType } from '@hono/node-server';
import jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import GeminiService from './gemini.service';
import { db } from '../db';
import { chats, messages } from '../db/schemas/chat.schema';
import { and, eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEBUG = process.env.NODE_ENV !== 'production';

export class SocketService {
  private io: SocketIOServer;

  constructor(server: ServerType) {
    this.io = new SocketIOServer(server as any, {
      cors: {
        origin: ['http://localhost:8081', 'http://localhost:19000', 'http://localhost:19006', 'http://10.0.2.2:3000'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        socket.data.userId = decoded.userId;
        
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      if (DEBUG) console.log(`✅ User ${userId} connected (socket: ${socket.id})`);

      // Join user to their own room
      socket.join(`user:${userId}`);

      // Handle chat message
      socket.on('send-message', async (data: { chatId: string; content: string }) => {
        try {
          const { chatId, content } = data;
          console.log(`📩 Received message from user ${userId} for chat ${chatId}`);

          // ⚡ OPTIMIZATION: Verify chat and get history in parallel
          const [chatResult, fullHistory] = await Promise.all([
            db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId))),
            ChatService.getMessageHistory(chatId)
          ]);

          const [chat] = chatResult;
          if (!chat) {
            console.error(`❌ Chat ${chatId} not found for user ${userId}`);
            socket.emit('error', { message: 'Chat not found' });
            return;
          }

          // Prepare history for AI (before saving user message)
          let limitedHistory = fullHistory.slice(-6);
          
          // Ensure history starts with a 'user' message (Gemini requirement)
          if (limitedHistory.length > 0 && limitedHistory[0].role !== 'user') {
            const firstUserIndex = limitedHistory.findIndex(msg => msg.role === 'user');
            if (firstUserIndex > 0) {
              limitedHistory = limitedHistory.slice(firstUserIndex);
            } else if (firstUserIndex === -1) {
              limitedHistory = [];
            }
          }
          
          if (DEBUG) console.log(`📚 History: ${fullHistory.length} total, using ${limitedHistory.length} messages`);

          // ⚡ EMIT AI START IMMEDIATELY - don't wait for DB saves
          socket.emit('ai-response-start', { chatId });

          // ⚡ OPTIMIZATION: Save user message in background (non-blocking)
          const saveUserMessagePromise = db
            .insert(messages)
            .values({
              chatId,
              content,
              role: 'user',
            })
            .returning()
            .then(([userMessage]) => {
              socket.emit('message-saved', {
                messageId: userMessage.id,
                chatId,
                content,
                role: 'user',
                createdAt: userMessage.createdAt,
              });
              return userMessage;
            });

          // ⚡ Update title in background if needed (non-blocking)
          if (chat.title === 'New Chat' && fullHistory.length === 0) {
            const newTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
            db.update(chats)
              .set({ title: newTitle, updatedAt: new Date() })
              .where(eq(chats.id, chatId))
              .then(() => {
                socket.emit('chat-title-updated', { chatId, title: newTitle });
              })
              .catch(err => console.error('Failed to update title:', err));
          }

          // ⚡ Start streaming IMMEDIATELY (don't wait for user message save)
          let fullResponse = '';
          let chunkNumber = 0;
          try {
            if (DEBUG) console.log(`🤖 Starting AI response generation for chat ${chatId}`);
            const generator = GeminiService.generateStreamingResponse(
              content,
              limitedHistory.map(msg => ({ role: msg.role, content: msg.content }))
            );

            for await (const chunk of generator) {
              chunkNumber++;
              fullResponse += chunk;
              if (DEBUG) console.log(`🔄 Emitting chunk #${chunkNumber} to client (${chunk.length} chars)`);
              socket.emit('ai-response-chunk', { chatId, chunk });
            }

            if (DEBUG) console.log(`💾 Saving assistant message for chat ${chatId}`);
            
            // Wait for user message to be saved before saving assistant message
            await saveUserMessagePromise;
            
            // Save complete response
            const assistantMessage = await ChatService.saveAssistantMessage(chatId, fullResponse);

            if (DEBUG) console.log(`✅ Message saved with ID ${assistantMessage.id}`);
            // Emit completion
            socket.emit('ai-response-complete', {
              chatId,
              messageId: assistantMessage.id,
              fullResponse,
              createdAt: assistantMessage.createdAt,
            });

          } catch (error) {
            console.error('❌ AI generation error:', error);
            socket.emit('ai-response-error', {
              chatId,
              error: error instanceof Error ? error.message : 'Failed to generate AI response',
            });
          }

        } catch (error) {
          console.error('❌ Send message error:', error);
          console.error('Error details:', error instanceof Error ? error.stack : error);
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to send message',
          });
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
        socket.to(`chat:${data.chatId}`).emit('user-typing', {
          userId,
          isTyping: data.isTyping,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (DEBUG) console.log(`❌ User ${userId} disconnected (socket: ${socket.id})`);
      });
    });
  }

  // Method to emit events to specific users
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Method to emit events to specific chat rooms
  public emitToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }
}

