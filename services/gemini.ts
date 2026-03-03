import { GoogleGenAI } from "@google/genai";
import type { AIService, ChatMessage } from '../types';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const geminiService: AIService = {
    name: 'Gemini',
    async chat(messages: ChatMessage[]) {

        //"assistant": "model"
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const response = await ai.models.generateContentStream({
            model: "gemini-2.0-flash",
            contents,
        });

        return (async function* () {
            for await (const chunk of response) {
                yield chunk.text ?? '';
            }
        })();
    }
}