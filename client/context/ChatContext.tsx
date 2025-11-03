import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ChatService, { Message as ServiceMessage, Chat as ServiceChat } from '../services/chat.service';
import SocketManager from '../services/socket.service';
import * as FileSystem from 'expo-file-system/legacy';

const DEBUG = __DEV__; // React Native's built-in development mode flag

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
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  isLoading: boolean;
  isThinking: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  createNewChat: () => Promise<string>;
  switchChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearCurrentChat: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithImage: (content: string, imageUri: string) => Promise<void>;
  sendMessageWithDocument: (content: string, documentUri: string, documentName: string) => Promise<void>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Convert service message to local message format
const convertMessage = (msg: ServiceMessage): Message => ({
  id: msg.id,
  text: msg.content,
  isUser: msg.role === 'user',
  timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
});

// Convert service chat to local chat format
const convertChat = (chat: ServiceChat): Chat => ({
  id: chat.id,
  title: chat.title,
  messages: chat.messages ? chat.messages.map(convertMessage) : [],
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  
  // Refs for real-time chunk streaming
  const streamingBufferRef = React.useRef(''); // What we've received from backend

  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  // Load chats on mount
  useEffect(() => {
    refreshChats();
  }, []);


  const refreshChats = async () => {
    try {
      setIsLoading(true);
      const { chats: fetchedChats } = await ChatService.getUserChats();
      setChats(fetchedChats.map(convertChat));
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async (): Promise<string> => {
    try {
      setIsLoading(true);
      const { chat } = await ChatService.createChat();
      const newChat = convertChat(chat);
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      return newChat.id;
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const switchChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      setCurrentChatId(chatId);
      
      // Fetch full chat with messages if not already loaded
      const existingChat = chats.find(c => c.id === chatId);
      if (!existingChat || existingChat.messages.length === 0) {
        const { chat } = await ChatService.getChatById(chatId);
        const fullChat = convertChat(chat);
        setChats(prev => prev.map(c => c.id === chatId ? fullChat : c));
      }
    } catch (error) {
      console.error('Failed to switch chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await ChatService.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (currentChatId === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  };

  const addMessage = (message: Message) => {
    // Add message locally (for optimistic updates)
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, message],
          updatedAt: new Date().toISOString(),
        };
      }
      return chat;
    }));
  };

  const sendMessage = async (content: string) => {
    let chatId = currentChatId;
    
    if (!chatId) {
      // Create a new chat first and get its ID
      chatId = await createNewChat();
    }

    // Guard: ensure chatId is set
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
    addMessage(userMessage);

    // Set thinking state and clear buffer
    setIsThinking(true);
    setStreamingMessage('');
    streamingBufferRef.current = '';

    try {
      // Connect socket if not connected
      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup listeners for this specific message
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          setIsThinking(false);
          setIsStreaming(true);
          streamingBufferRef.current = '';
          setStreamingMessage('');
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          // Add chunk to buffer and display immediately - real-time like ChatGPT
          streamingBufferRef.current += data.chunk;
          setStreamingMessage(streamingBufferRef.current);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          // Ensure we show the complete response while we fetch from DB
          streamingBufferRef.current = data.fullResponse;
          setStreamingMessage(data.fullResponse);
          
          // Fetch the updated chat FIRST, then clear streaming
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          
          // Update the chat state with the final message
          setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));
          
          // Now clear streaming state AFTER the new message is in the chat
          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';

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
          
          // Clear buffers
          setIsThinking(false);
          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';
          
          // Cleanup listeners
          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleTitleUpdate = (data: { chatId: string; title: string }) => {
        if (data.chatId === chatId) {
          setChats(prev => prev.map(c => 
            c.id === chatId ? { ...c, title: data.title } : c
          ));
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
      
      // Clear buffers
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingMessage('');
      streamingBufferRef.current = '';
      throw error;
    }
  };

  const sendMessageWithImage = async (content: string, imageUri: string) => {
    let chatId = currentChatId;
    
    if (!chatId) {
      chatId = await createNewChat();
    }

    if (!chatId) {
      console.error('Failed to get or create chat ID');
      return;
    }

    // Add user message optimistically with actual image
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content || 'Analyze this image',
      isUser: true,
      timestamp: formatTime(),
      imageUri: imageUri,
    };
    addMessage(userMessage);

    setIsThinking(true);
    setStreamingMessage('');
    streamingBufferRef.current = '';

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Get image mime type from URI extension
      const extension = imageUri.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      // Connect socket if not connected
      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup listeners (similar to sendMessage)
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          setIsThinking(false);
          setIsStreaming(true);
          streamingBufferRef.current = '';
          setStreamingMessage('');
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          streamingBufferRef.current += data.chunk;
          setStreamingMessage(streamingBufferRef.current);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          streamingBufferRef.current = data.fullResponse;
          setStreamingMessage(data.fullResponse);
          
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));

          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';

          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleError = (data: { chatId: string; error: string }) => {
        if (data.chatId === chatId) {
          console.error('❌ AI response error:', data.error);
          
          setIsThinking(false);
          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';
          
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

      // Send message with image via WebSocket
      await SocketManager.sendMessageWithImage(chatId, content, base64, mimeType);

    } catch (error) {
      console.error('Failed to send message with image:', error);
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingMessage('');
      streamingBufferRef.current = '';
      throw error;
    }
  };

  const sendMessageWithDocument = async (content: string, documentUri: string, documentName: string) => {
    let chatId = currentChatId;
    
    if (!chatId) {
      chatId = await createNewChat();
    }

    if (!chatId) {
      console.error('Failed to get or create chat ID');
      return;
    }

    // Add user message optimistically with document reference
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content || 'Analyze this document',
      isUser: true,
      timestamp: formatTime(),
      documentUri: documentUri,
      documentName: documentName,
    };
    addMessage(userMessage);

    setIsThinking(true);
    setStreamingMessage('');
    streamingBufferRef.current = '';

    try {
      // Convert document to base64
      const base64 = await FileSystem.readAsStringAsync(documentUri, {
        encoding: 'base64',
      });

      // Get document mime type from URI extension
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

      // Connect socket if not connected
      if (!SocketManager.isConnected()) {
        await SocketManager.connect();
      }

      // Setup listeners (similar to sendMessageWithImage)
      const handleStart = (data: { chatId: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('🎬 AI response started');
          setIsThinking(false);
          setIsStreaming(true);
          streamingBufferRef.current = '';
          setStreamingMessage('');
        }
      };

      const handleChunk = (data: { chatId: string; chunk: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log(`📨 Received chunk (${data.chunk.length} chars)`);
          streamingBufferRef.current += data.chunk;
          setStreamingMessage(streamingBufferRef.current);
        }
      };

      const handleComplete = async (data: { chatId: string; messageId: string; fullResponse: string }) => {
        if (data.chatId === chatId) {
          if (DEBUG) console.log('✅ AI response complete');
          
          streamingBufferRef.current = data.fullResponse;
          setStreamingMessage(data.fullResponse);
          
          const { chat } = await ChatService.getChatById(chatId!);
          const updatedChat = convertChat(chat);
          setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));

          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';

          SocketManager.off('ai-response-start', handleStart);
          SocketManager.off('ai-response-chunk', handleChunk);
          SocketManager.off('ai-response-complete', handleComplete);
          SocketManager.off('ai-response-error', handleError);
        }
      };

      const handleError = (data: { chatId: string; error: string }) => {
        if (data.chatId === chatId) {
          console.error('❌ AI response error:', data.error);
          
          setIsThinking(false);
          setIsStreaming(false);
          setStreamingMessage('');
          streamingBufferRef.current = '';
          
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

      // Send message with document via WebSocket
      await SocketManager.sendMessageWithDocument(chatId, content, base64, mimeType, documentName);

    } catch (error) {
      console.error('Failed to send message with document:', error);
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingMessage('');
      streamingBufferRef.current = '';
      throw error;
    }
  };

  const clearCurrentChat = async () => {
    if (!currentChatId) return;

    try {
      await ChatService.clearChatMessages(currentChatId);
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [],
            updatedAt: new Date().toISOString(),
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Failed to clear chat:', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChatId,
        currentChat,
        isLoading,
        isThinking,
        isStreaming,
        streamingMessage,
        createNewChat,
        switchChat,
        deleteChat,
        addMessage,
        clearCurrentChat,
        sendMessage,
        sendMessageWithImage,
        sendMessageWithDocument,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
