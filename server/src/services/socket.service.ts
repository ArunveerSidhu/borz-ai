import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
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

  constructor(server: HttpServer) {
    // Configure CORS with environment variable support for Railway
    const allowedOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .concat([
        'http://localhost:8081',
        'http://localhost:19000',
        'http://localhost:19006',
        'http://10.0.2.2:3000',
      ]);

    this.io = new SocketIOServer(server as any, {
      cors: {
        origin: allowedOrigins,
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

      // Handle message with image
      socket.on('send-message-with-image', async (data: { chatId: string; content: string; imageBase64: string; mimeType: string }) => {
        try {
          const { chatId, content, imageBase64, mimeType } = data;
          if (DEBUG) console.log(`📩 Received message with image from user ${userId} for chat ${chatId}`);

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
              content: `🖼️ [Image] ${content}`,
              role: 'user',
            })
            .returning()
            .then(([userMessage]) => {
              socket.emit('message-saved', {
                messageId: userMessage.id,
                chatId,
                content: userMessage.content,
                role: 'user',
                createdAt: userMessage.createdAt,
              });
              return userMessage;
            });

          // ⚡ Update title in background if needed (non-blocking)
          if (chat.title === 'New Chat' && fullHistory.length === 0) {
            const newTitle = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'Image Analysis';
            db.update(chats)
              .set({ title: newTitle, updatedAt: new Date() })
              .where(eq(chats.id, chatId))
              .then(() => {
                socket.emit('chat-title-updated', { chatId, title: newTitle });
              })
              .catch(err => console.error('Failed to update title:', err));
          }

          // ⚡ Start streaming IMMEDIATELY with Gemini Vision API
          let fullResponse = '';
          try {
            if (DEBUG) console.log(`🤖 Starting AI Vision response generation for chat ${chatId}`);
            
            // Use Gemini Vision API for image analysis
            const response = await GeminiService.generateWithImage(content || 'What do you see in this image?', imageBase64, mimeType);
            
            // Emit the response as chunks for consistent UX
            const chunkSize = 100;
            for (let i = 0; i < response.length; i += chunkSize) {
              const chunk = response.substring(i, Math.min(i + chunkSize, response.length));
              fullResponse += chunk;
              if (DEBUG) console.log(`🔄 Emitting chunk to client (${chunk.length} chars)`);
              socket.emit('ai-response-chunk', { chatId, chunk });
              // Small delay for smoother streaming effect
              await new Promise(resolve => setTimeout(resolve, 50));
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
          console.error('❌ Send message with image error:', error);
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to send message with image',
          });
        }
      });

      // Handle message with document
      socket.on('send-message-with-document', async (data: { chatId: string; content: string; documentBase64: string; mimeType: string; fileName: string }) => {
        try {
          const { chatId, content, documentBase64, mimeType, fileName } = data;
          if (DEBUG) console.log(`📩 Received message with document from user ${userId} for chat ${chatId}: ${fileName}`);

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
              content: `📄 [Document: ${fileName}] ${content}`,
              role: 'user',
            })
            .returning()
            .then(([userMessage]) => {
              socket.emit('message-saved', {
                messageId: userMessage.id,
                chatId,
                content: userMessage.content,
                role: 'user',
                createdAt: userMessage.createdAt,
              });
              return userMessage;
            });

          // ⚡ Update title in background if needed (non-blocking)
          if (chat.title === 'New Chat' && fullHistory.length === 0) {
            const newTitle = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : `Document: ${fileName}`;
            db.update(chats)
              .set({ title: newTitle, updatedAt: new Date() })
              .where(eq(chats.id, chatId))
              .then(() => {
                socket.emit('chat-title-updated', { chatId, title: newTitle });
              })
              .catch(err => console.error('Failed to update title:', err));
          }

          // ⚡ Start streaming IMMEDIATELY with Gemini Document Analysis
          let fullResponse = '';
          try {
            if (DEBUG) console.log(`🤖 Starting AI Document response generation for chat ${chatId}`);
            
            // Use Gemini Document API for document analysis
            const response = await GeminiService.generateWithDocument(content || 'Analyze this document', documentBase64, mimeType, fileName);
            
            // Emit the response as chunks for consistent UX
            const chunkSize = 100;
            for (let i = 0; i < response.length; i += chunkSize) {
              const chunk = response.substring(i, Math.min(i + chunkSize, response.length));
              fullResponse += chunk;
              if (DEBUG) console.log(`🔄 Emitting chunk to client (${chunk.length} chars)`);
              socket.emit('ai-response-chunk', { chatId, chunk });
              // Small delay for smoother streaming effect
              await new Promise(resolve => setTimeout(resolve, 50));
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
          console.error('❌ Send message with document error:', error);
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Failed to send message with document',
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

