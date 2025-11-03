import { GoogleGenerativeAI } from '@google/generative-ai';

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
      const visionModel = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
      
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
}

export default new GeminiService();

