import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  addMessage: (message: Message) => void;
  clearCurrentChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateChatTitle = (firstMessage: string): string => {
  const maxLength = 30;
  if (firstMessage.length <= maxLength) return firstMessage;
  return firstMessage.substring(0, maxLength) + '...';
};

const formatTime = () => {
  return new Date().toISOString();
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: formatTime(),
      updatedAt: formatTime(),
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const switchChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  const addMessage = (message: Message) => {
    if (!currentChatId) {
      // If no current chat, create one
      const newChat: Chat = {
        id: Date.now().toString(),
        title: generateChatTitle(message.text),
        messages: [message],
        createdAt: formatTime(),
        updatedAt: formatTime(),
      };
      
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    } else {
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, message];
          const title = chat.messages.length === 0 && message.isUser
            ? generateChatTitle(message.text)
            : chat.title;
          
          return {
            ...chat,
            title,
            messages: updatedMessages,
            updatedAt: formatTime(),
          };
        }
        return chat;
      }));
    }
  };

  const clearCurrentChat = () => {
    if (currentChatId) {
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [],
            updatedAt: formatTime(),
          };
        }
        return chat;
      }));
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChatId,
        currentChat,
        createNewChat,
        switchChat,
        deleteChat,
        addMessage,
        clearCurrentChat,
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

