import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface MessageHistory {
  role: string;
  content: string;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
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
      const chat = this.model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessageStream(prompt);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
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

