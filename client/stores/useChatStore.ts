import { create } from 'zustand';
import ChatService, { Message as ServiceMessage, Chat as ServiceChat } from '../services/chat.service';
import SocketManager from '../services/socket.service';
import * as FileSystem from 'expo-file-system/legacy';

const DEBUG = __DEV__;

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  imageUri?: string;
  documentUri?: string;
  documentName?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  // State
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  isThinking: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  streamingBuffer: string;

  // Computed
  currentChat: () => Chat | null;

  // Actions
  setChats: (chats: Chat[]) => void;
  setCurrentChatId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsThinking: (thinking: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingMessage: (message: string) => void;
  appendStreamingChunk: (chunk: string) => void;
  clearStreaming: () => void;
  
  // Chat operations
  refreshChats: () => Promise<void>;
  createNewChat: () => Promise<string>;
  switchChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  clearCurrentChat: () => Promise<void>;
  
  // Message sending
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithImage: (content: string, imageUri: string) => Promise<void>;
  sendMessageWithDocument: (content: string, documentUri: string, documentName: string) => Promise<void>;
}

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const convertMessage = (msg: ServiceMessage): Message => ({
  id: msg.id,
  text: msg.content,
  isUser: msg.role === 'user',
  timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
});

const convertChat = (chat: ServiceChat): Chat => ({
  id: chat.id,
  title: chat.title,
  messages: chat.messages ? chat.messages.map(convertMessage) : [],
  messageCount: chat.messageCount,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  currentChatId: null,
  isLoading: false,
  isThinking: false,
  isStreaming: false,
  streamingMessage: '',
  streamingBuffer: '',

  // Computed
  currentChat: () => {
    const { chats, currentChatId } = get();
    return chats.find(chat => chat.id === currentChatId) || null;
  },

  // Basic setters
  setChats: (chats) => set({ chats }),
  setCurrentChatId: (id) => set({ currentChatId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsThinking: (thinking) => set({ isThinking: thinking }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingMessage: (message) => set({ streamingMessage: message }),
  
  appendStreamingChunk: (chunk) => {
    const newBuffer = get().streamingBuffer + chunk;
    set({ 
      streamingBuffer: newBuffer,
      streamingMessage: newBuffer 
    });
  },

  clearStreaming: () => set({ 
    isStreaming: false, 
    isThinking: false,
    streamingMessage: '', 
    streamingBuffer: '' 
  }),

  // Refresh chats from server
  refreshChats: async () => {
    try {
      set({ isLoading: true });
      const { chats: fetchedChats } = await ChatService.getUserChats();
      set({ chats: fetchedChats.map(convertChat) });
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Create new chat
  createNewChat: async () => {
    try {
      set({ isLoading: true });
      const { chat } = await ChatService.createChat();
      const newChat = convertChat(chat);
      set(state => ({
        chats: [newChat, ...state.chats],
        currentChatId: newChat.id
      }));
      return newChat.id;
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Switch to a different chat
  switchChat: async (chatId) => {
    try {
      set({ isLoading: true, currentChatId: chatId });
      
      const existingChat = get().chats.find(c => c.id === chatId);
      if (!existingChat || existingChat.messages.length === 0) {
        const { chat } = await ChatService.getChatById(chatId);
        const fullChat = convertChat(chat);
        set(state => ({
          chats: state.chats.map(c => c.id === chatId ? fullChat : c)
        }));
      }
    } catch (error) {
      console.error('Failed to switch chat:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete chat
  deleteChat: async (chatId) => {
    try {
      await ChatService.deleteChat(chatId);
      const state = get();
      const remainingChats = state.chats.filter(chat => chat.id !== chatId);
      
      set({
        chats: remainingChats,
        currentChatId: state.currentChatId === chatId 
          ? (remainingChats.length > 0 ? remainingChats[0].id : null)
          : state.currentChatId
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  },

  // Add message to current chat (optimistic update)
  addMessage: (message) => {
    set(state => ({
      chats: state.chats.map(chat => {
        if (chat.id === state.currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: new Date().toISOString(),
          };
        }
        return chat;
      })
    }));
  },

  // Update specific chat
  updateChat: (chatId, updates) => {
    set(state => ({
      chats: state.chats.map(chat => 
        chat.id === chatId ? { ...chat, ...updates } : chat
      )
    }));
  },

  // Clear current chat messages
  clearCurrentChat: async () => {
    const { currentChatId } = get();
    if (!currentChatId) return;

    try {
      await ChatService.clearChatMessages(currentChatId);
      set(state => ({
        chats: state.chats.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [],
              updatedAt: new Date().toISOString(),
            };
          }
          return chat;
        })
      }));
    } catch (error) {
      console.error('Failed to clear chat:', error);
      throw error;
    }
  },

  // Send text message
  sendMessage: async (content) => {
    let chatId = get().currentChatId;
    
    if (!chatId) {
      chatId = await get().createNewChat();
    }

    if (!chatId) {
      console.error('Failed to get or create chat ID');
      return;
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content,
      isUser: true,
      timestamp: formatTime(),
    };
    get().addMessage(userMessage);

    // Set thinking state and clear streaming buffer
    set({ 
      isThinking: true, 
      streamingMessage: '', 
      streamingBuffer: '' 
    });

    try {
      // Connect socket if needed
      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup socket listeners
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          set({ 
            isThinking: false, 
            isStreaming: true,
            streamingBuffer: '',
            streamingMessage: '' 
          });
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          get().appendStreamingChunk(data.chunk);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          // Show complete response while fetching from DB
          set({ 
            streamingBuffer: data.fullResponse,
            streamingMessage: data.fullResponse 
          });
          
          // Fetch updated chat
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          
          set(state => ({
            chats: state.chats.map(c => c.id === chatId ? updatedChat : c)
          }));
          
          // Clear streaming state
          get().clearStreaming();

          // Cleanup listeners
          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleError = (data: { chatId: string; error: string }) => {
        if (data.chatId === chatId) {
          console.error('❌ AI response error:', data.error);
          get().clearStreaming();
          
          // Cleanup listeners
          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleTitleUpdate = (data: { chatId: string; title: string }) => {
        if (data.chatId === chatId) {
          get().updateChat(chatId, { title: data.title });
        }
      };

      // Attach listeners
      SocketManager.onAIResponseStart(handleStart);
      SocketManager.onAIResponseChunk(handleChunk);
      SocketManager.onAIResponseComplete(handleComplete);
      SocketManager.onAIResponseError(handleError);
      SocketManager.onChatTitleUpdated(handleTitleUpdate);

      // Send message via WebSocket
      await SocketManager.sendMessage(chatId, content);

    } catch (error) {
      console.error('Failed to send message:', error);
      get().clearStreaming();
      throw error;
    }
  },

  // Send message with image
  sendMessageWithImage: async (content, imageUri) => {
    let chatId = get().currentChatId;
    
    if (!chatId) {
      chatId = await get().createNewChat();
    }

    if (!chatId) {
      console.error('Failed to get or create chat ID');
      return;
    }

    // Add user message with image
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content || 'Analyze this image',
      isUser: true,
      timestamp: formatTime(),
      imageUri: imageUri,
    };
    get().addMessage(userMessage);

    set({ 
      isThinking: true, 
      streamingMessage: '', 
      streamingBuffer: '' 
    });

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const extension = imageUri.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup listeners (same as sendMessage)
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          set({ 
            isThinking: false, 
            isStreaming: true,
            streamingBuffer: '',
            streamingMessage: '' 
          });
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          get().appendStreamingChunk(data.chunk);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          set({ 
            streamingBuffer: data.fullResponse,
            streamingMessage: data.fullResponse 
          });
          
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          
          set(state => ({
            chats: state.chats.map(c => c.id === chatId ? updatedChat : c)
          }));

          get().clearStreaming();

          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleError = (data: { chatId: string; error: string }) => {
        if (data.chatId === chatId) {
          console.error('❌ AI response error:', data.error);
          get().clearStreaming();
          
          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      SocketManager.onAIResponseStart(handleStart);
      SocketManager.onAIResponseChunk(handleChunk);
      SocketManager.onAIResponseComplete(handleComplete);
      SocketManager.onAIResponseError(handleError);

      await SocketManager.sendMessageWithImage(chatId, content, base64, mimeType);

    } catch (error) {
      console.error('Failed to send message with image:', error);
      get().clearStreaming();
      throw error;
    }
  },

  // Send message with document
  sendMessageWithDocument: async (content, documentUri, documentName) => {
    let chatId = get().currentChatId;
    
    if (!chatId) {
      chatId = await get().createNewChat();
    }

    if (!chatId) {
      console.error('Failed to get or create chat ID');
      return;
    }

    // Add user message with document
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content || 'Analyze this document',
      isUser: true,
      timestamp: formatTime(),
      documentUri: documentUri,
      documentName: documentName,
    };
    get().addMessage(userMessage);

    set({ 
      isThinking: true, 
      streamingMessage: '', 
      streamingBuffer: '' 
    });

    try {
      // Convert document to base64
      const base64 = await FileSystem.readAsStringAsync(documentUri, {
        encoding: 'base64',
      });

      const extension = documentUri.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (extension === 'pdf') {
        mimeType = 'application/pdf';
      } else if (extension === 'docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (extension === 'txt') {
        mimeType = 'text/plain';
      } else if (extension === 'md') {
        mimeType = 'text/markdown';
      }

      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup listeners (same pattern)
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          set({ 
            isThinking: false, 
            isStreaming: true,
            streamingBuffer: '',
            streamingMessage: '' 
          });
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          get().appendStreamingChunk(data.chunk);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          set({ 
            streamingBuffer: data.fullResponse,
            streamingMessage: data.fullResponse 
          });
          
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          
          set(state => ({
            chats: state.chats.map(c => c.id === chatId ? updatedChat : c)
          }));

          get().clearStreaming();

          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleError = (data: { chatId: string; error: string }) => {
        if (data.chatId === chatId) {
          console.error('❌ AI response error:', data.error);
          get().clearStreaming();
          
          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      SocketManager.onAIResponseStart(handleStart);
      SocketManager.onAIResponseChunk(handleChunk);
      SocketManager.onAIResponseComplete(handleComplete);
      SocketManager.onAIResponseError(handleError);

      await SocketManager.sendMessageWithDocument(chatId, content, base64, mimeType, documentName);

    } catch (error) {
      console.error('Failed to send message with document:', error);
      get().clearStreaming();
      throw error;
    }
  },
}));
