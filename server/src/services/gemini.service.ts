import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const DEBUG = process.env.NODE_ENV !== 'production';

interface MessageHistory {
  role: string;
  content: string;
}

export class GeminiService {
  // ⚡ Using Gemini Flash for 2-3x faster responses with great quality
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  });

  async generateResponse(prompt: string, history: MessageHistory[] = []): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(prompt);
      return result.response.text();
    } catch (error: any) {
      console.error('Gemini API Error:', {
        message: error.message,
        status: error.status,
      });
      throw new Error(`Failed to generate AI response: ${error.message || 'Unknown error'}`);
    }
  }

  async *generateStreamingResponse(
    prompt: string, 
    history: MessageHistory[] = []
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (DEBUG) console.log(`🚀 Starting Gemini stream with ${history.length} history messages`);
      
      const chat = this.model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessageStream(prompt);
      let chunkCount = 0;
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkCount++;
          if (DEBUG) console.log(`📦 Gemini chunk #${chunkCount}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          yield text;
        }
      }
      
      if (DEBUG) console.log(`✅ Gemini stream completed with ${chunkCount} chunks`);
    } catch (error: any) {
      console.error('Gemini Streaming Error:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
      });
      throw new Error(`Failed to stream AI response: ${error.message || 'Unknown error'}`);
    }
  }

  async generateWithImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    try {
      // Use the same fast model for vision - gemini-2.0-flash-exp supports multimodal
      const visionModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      
      const result = await visionModel.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
      ]);

      return result.response.text();
    } catch (error: any) {
      console.error('Gemini Vision Error:', {
        message: error.message,
        status: error.status,
      });
      throw new Error(`Failed to analyze image: ${error.message || 'Unknown error'}`);
    }
  }

  async parseDocument(documentBase64: string, mimeType: string, fileName: string): Promise<{ text: string; metadata: any }> {
    try {
      const buffer = Buffer.from(documentBase64, 'base64');
      
      if (DEBUG) console.log(`📄 Parsing document: ${fileName} (${mimeType})`);

      // Handle PDF files
      if (mimeType === 'application/pdf') {
        // Use dynamic require for pdf-parse v2 (CommonJS module)
        const { PDFParse } = require('pdf-parse');
        // pdf-parse v2 expects 'data' not 'buffer'
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return {
          text: result.text,
          metadata: {
            pages: result.numpages || result.pages,
            info: result.info || {},
          },
        };
      }
      
      // Handle Word documents (.docx)
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return {
          text: result.value,
          metadata: {
            messages: result.messages,
          },
        };
      }

      // Handle plain text files
      if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return {
          text: buffer.toString('utf-8'),
          metadata: {},
        };
      }

      throw new Error(`Unsupported document type: ${mimeType}`);
    } catch (error: any) {
      console.error('Document parsing error:', {
        message: error.message,
        fileName,
        mimeType,
      });
      throw new Error(`Failed to parse document: ${error.message || 'Unknown error'}`);
    }
  }

  async generateWithDocument(prompt: string, documentBase64: string, mimeType: string, fileName: string): Promise<string> {
    try {
      if (DEBUG) console.log(`🤖 Starting document analysis for: ${fileName}`);
      
      // Parse the document first
      const { text, metadata } = await this.parseDocument(documentBase64, mimeType, fileName);
      
      if (!text || text.trim().length === 0) {
        throw new Error('Document appears to be empty or could not be parsed');
      }

      if (DEBUG) console.log(`📝 Extracted ${text.length} characters from document`);

      // Build context-aware prompt
      let enhancedPrompt = `I have a document named "${fileName}"`;
      
      if (metadata.pages) {
        enhancedPrompt += ` with ${metadata.pages} page(s)`;
      }
      
      enhancedPrompt += `.\n\nDocument content:\n\n${text}\n\n---\n\n`;
      
      if (prompt && prompt.trim()) {
        enhancedPrompt += `User question: ${prompt}`;
      } else {
        enhancedPrompt += 'Please provide a comprehensive summary and analysis of this document.';
      }

      // Use Gemini to analyze the document
      const result = await this.model.generateContent(enhancedPrompt);
      return result.response.text();
      
    } catch (error: any) {
      console.error('Gemini Document Analysis Error:', {
        message: error.message,
        fileName,
      });
      throw new Error(`Failed to analyze document: ${error.message || 'Unknown error'}`);
    }
  }
}

export default new GeminiService();

