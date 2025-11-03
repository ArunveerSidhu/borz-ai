import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

const MarkdownContentComponent: React.FC<MarkdownContentProps> = ({ content, isStreaming = false }) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const copyToClipboard = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyFullMessage = async () => {
    await Clipboard.setStringAsync(content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // ⚡ CLEVER SOLUTION: Show raw text while streaming, format when complete
  if (isStreaming) {
    return (
      <Text className="text-zinc-200 text-base leading-7">
        {content}
      </Text>
    );
  }

  const markdownStyles = {
    body: {
      color: '#e4e4e7', // zinc-200
      fontSize: 16,
      lineHeight: 24,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
      flexWrap: 'wrap' as 'wrap',
      flexShrink: 1,
    },
    text: {
      color: '#e4e4e7',
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: '#fafafa', // zinc-50
      fontSize: 24,
      fontWeight: '700' as '700',
      marginTop: 16,
      marginBottom: 12,
    },
    heading2: {
      color: '#fafafa',
      fontSize: 20,
      fontWeight: '700' as '700',
      marginTop: 14,
      marginBottom: 10,
    },
    heading3: {
      color: '#fafafa',
      fontSize: 18,
      fontWeight: '600' as '600',
      marginTop: 12,
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: '#27272a', // zinc-800
      color: '#a78bfa', // violet-400
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: '#18181b', // zinc-900
      color: '#e4e4e7',
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: 'monospace',
      marginVertical: 8,
      borderWidth: 1,
      borderColor: '#3f3f46', // zinc-700
    },
    fence: {
      backgroundColor: '#18181b',
      color: '#e4e4e7',
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: 'monospace',
      marginVertical: 8,
      borderWidth: 1,
      borderColor: '#3f3f46',
    },
    blockquote: {
      backgroundColor: '#27272a',
      borderLeftColor: '#8b5cf6', // violet-500
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
      borderRadius: 4,
    },
    list_item: {
      marginVertical: 4,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    link: {
      color: '#a78bfa',
      textDecorationLine: 'underline' as 'underline',
    },
    strong: {
      fontWeight: '700' as '700',
      color: '#fafafa',
    },
    em: {
      fontStyle: 'italic' as 'italic',
    },
    hr: {
      backgroundColor: '#3f3f46',
      height: 1,
      marginVertical: 16,
    },
    table: {
      borderWidth: 1,
      borderColor: '#3f3f46',
      borderRadius: 8,
      marginVertical: 8,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: '#3f3f46',
      flexDirection: 'row' as 'row',
    },
    th: {
      flex: 1,
      padding: 8,
      backgroundColor: '#27272a',
      fontWeight: '700' as '700',
    },
    td: {
      flex: 1,
      padding: 8,
    },
  };

  // Custom renderer for code blocks with copy button
  const renderCodeBlock = (node: any, children: any, parent: any, styles: any) => {
    const codeContent = node.content || '';
    const language = node.sourceInfo || 'text';
    // Generate unique key based on content hash
    const blockKey = `code-${codeContent.substring(0, 20).replace(/\s/g, '')}-${codeContent.length}`;
    const isCopied = copiedIndex === blockKey;

    return (
      <View key={blockKey} className="my-2">
        <View className="bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
          {/* Code header with language and copy button */}
          <View className="flex-row justify-between items-center px-3 py-2 bg-zinc-800 border-b border-zinc-700">
            <Text className="text-zinc-400 text-xs font-semibold">
              {language.toUpperCase()}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(codeContent, blockKey)}
              className={`flex-row items-center gap-1 px-2 py-1 rounded ${
                isCopied ? 'bg-green-500/10' : ''
              }`}
            >
              <Ionicons
                name={isCopied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={isCopied ? '#22c55e' : '#a1a1aa'}
              />
              <Text className={`text-xs ${isCopied ? 'text-green-500' : 'text-zinc-400'}`}>
                {isCopied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Code content */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text className="text-zinc-200 p-3 text-sm" style={{ fontFamily: 'monospace', lineHeight: 20 }}>
              {codeContent}
            </Text>
          </ScrollView>
        </View>
      </View>
    );
  };

  const rules = {
    fence: renderCodeBlock,
    code_block: renderCodeBlock,
  };

  // Render markdown with fallback to plain text if it fails
  return (
    <View style={{ width: '100%' }}>
      {content ? (
        <>
          <Markdown style={markdownStyles} rules={rules}>
            {content}
          </Markdown>

          {/* Copy full message button */}
          <TouchableOpacity
            onPress={copyFullMessage}
            className={`flex-row items-center gap-1.5 mt-3 py-1.5 px-2.5 rounded self-start ${
              copiedMessage ? 'bg-green-500/10' : 'bg-zinc-800'
            }`}
          >
            <Ionicons 
              name={copiedMessage ? 'checkmark' : 'copy-outline'} 
              size={14} 
              color={copiedMessage ? '#22c55e' : '#a1a1aa'} 
            />
            <Text className={`text-xs font-medium ${copiedMessage ? 'text-green-500' : 'text-zinc-400'}`}>
              {copiedMessage ? 'Copied!' : 'Copy message'}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders during streaming
export const MarkdownContent = React.memo(MarkdownContentComponent, (prevProps, nextProps) => {
  // Only re-render if content or streaming state changed
  return prevProps.content === nextProps.content && prevProps.isStreaming === nextProps.isStreaming;
});

