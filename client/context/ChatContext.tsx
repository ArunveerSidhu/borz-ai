import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ChatService, { Message as ServiceMessage, Chat as ServiceChat } from '../services/chat.service';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
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
  createNewChat: () => Promise<void>;
  switchChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearCurrentChat: () => Promise<void>;
  sendMessage: (content: string, onChunk?: (chunk: string) => void) => Promise<void>;
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

  const createNewChat = async () => {
    try {
      setIsLoading(true);
      const { chat } = await ChatService.createChat();
      const newChat = convertChat(chat);
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
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

  const sendMessage = async (content: string, onChunk?: (chunk: string) => void) => {
    if (!currentChatId) {
      // Create a new chat first
      await createNewChat();
      // Wait a bit for the state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const chatId = currentChatId!;

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: content,
      isUser: true,
      timestamp: formatTime(),
    };
    addMessage(userMessage);

    try {
      // Send to backend and get streaming response
      const fullResponse = await ChatService.sendMessage(chatId, content, onChunk);
      
      // Refresh the chat to get the saved messages with real IDs
      const { chat } = await ChatService.getChatById(chatId);
      const updatedChat = convertChat(chat);
      
      setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c));

      // Update title if it's still "New Chat"
      const currentChatData = chats.find(c => c.id === chatId);
      if (currentChatData && currentChatData.title === 'New Chat') {
        await refreshChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
        createNewChat,
        switchChat,
        deleteChat,
        addMessage,
        clearCurrentChat,
        sendMessage,
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
