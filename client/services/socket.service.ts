import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();

    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        console.log('✅ Socket connected:', this.socket!.id);
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket!.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to server'));
        }
      });
    });
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Socket disconnected manually');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Send message to server
  async sendMessage(chatId: string, content: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      console.log('📤 Sending message via WebSocket:', { chatId, content: content.substring(0, 50) + '...' });
      this.socket!.emit('send-message', { chatId, content });
      
      // Set timeout for response
      const timeout = setTimeout(() => {
        console.error('⏱️ Message send timeout');
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        reject(new Error('Message send timeout'));
      }, 60000); // 60 second timeout

      // Listen for confirmation
      const onMessageSaved = (data: any) => {
        console.log('✅ Message saved confirmation received:', data);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        resolve();
      };

      const onError = (error: any) => {
        console.error('❌ Socket error received:', error);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        const errorMessage = error.message || error.error || 'Failed to send message';
        reject(new Error(errorMessage));
      };

      this.socket!.once('message-saved', onMessageSaved);
      this.socket!.once('error', onError);
    });
  }

  // Send message with image to server
  async sendMessageWithImage(chatId: string, content: string, imageBase64: string, mimeType: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      console.log('📤 Sending message with image via WebSocket:', { chatId, contentLength: content.length, imageSize: imageBase64.length });
      this.socket!.emit('send-message-with-image', { chatId, content, imageBase64, mimeType });
      
      // Set timeout for response
      const timeout = setTimeout(() => {
        console.error('⏱️ Message send timeout');
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        reject(new Error('Message send timeout'));
      }, 120000); // 120 second timeout for images

      // Listen for confirmation
      const onMessageSaved = (data: any) => {
        console.log('✅ Message saved confirmation received:', data);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        resolve();
      };

      const onError = (error: any) => {
        console.error('❌ Socket error received:', error);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        const errorMessage = error.message || error.error || 'Failed to send message with image';
        reject(new Error(errorMessage));
      };

      this.socket!.once('message-saved', onMessageSaved);
      this.socket!.once('error', onError);
    });
  }

  // Send message with document to server
  async sendMessageWithDocument(chatId: string, content: string, documentBase64: string, mimeType: string, fileName: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      console.log('📤 Sending message with document via WebSocket:', { chatId, contentLength: content.length, fileName, documentSize: documentBase64.length });
      this.socket!.emit('send-message-with-document', { chatId, content, documentBase64, mimeType, fileName });
      
      // Set timeout for response
      const timeout = setTimeout(() => {
        console.error('⏱️ Message send timeout');
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        reject(new Error('Message send timeout'));
      }, 180000); // 180 second timeout for documents (can be large)

      // Listen for confirmation
      const onMessageSaved = (data: any) => {
        console.log('✅ Message saved confirmation received:', data);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        resolve();
      };

      const onError = (error: any) => {
        console.error('❌ Socket error received:', error);
        clearTimeout(timeout);
        this.socket!.off('message-saved', onMessageSaved);
        this.socket!.off('error', onError);
        const errorMessage = error.message || error.error || 'Failed to send message with document';
        reject(new Error(errorMessage));
      };

      this.socket!.once('message-saved', onMessageSaved);
      this.socket!.once('error', onError);
    });
  }

  // Listen for AI response start
  onAIResponseStart(callback: (data: { chatId: string }) => void) {
    this.socket?.on('ai-response-start', callback);
  }

  // Listen for AI response chunks
  onAIResponseChunk(callback: (data: { chatId: string; chunk: string }) => void) {
    this.socket?.on('ai-response-chunk', callback);
  }

  // Listen for AI response completion
  onAIResponseComplete(callback: (data: { chatId: string; messageId: string; fullResponse: string; createdAt: string }) => void) {
    this.socket?.on('ai-response-complete', callback);
  }

  // Listen for AI response errors
  onAIResponseError(callback: (data: { chatId: string; error: string }) => void) {
    this.socket?.on('ai-response-error', callback);
  }

  // Listen for chat title updates
  onChatTitleUpdated(callback: (data: { chatId: string; title: string }) => void) {
    this.socket?.on('chat-title-updated', callback);
  }

  // Remove listeners
  off(event: string, callback?: any) {
    this.socket?.off(event, callback);
  }

  // Remove all listeners for an event
  offAll(event: string) {
    this.socket?.removeAllListeners(event);
  }
}

export default new SocketManager();

