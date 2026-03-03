import { cerebrasService } from './services/cerebras';
import {groqService} from './services/groq';
import type { AIService, ChatMessage } from './types';
import { geminiService } from './services/gemini';
import { openRouterService } from './services/openrouter';
//import { verifyToken, hasRole } from './src/middleware/auth';

const services: AIService[]= [
    groqService,
    cerebrasService,
    //geminiService, //cuota excedida
    //openRouterService, //se demora al responder
    
]
let currentServiceIndex = 0;

function getNextService(){
    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex +1) %services.length;
    return service;
}

const server = Bun.serve({
    port: process.env.PORT ?? 3000,
    async fetch(req){
        const { pathname } = new URL(req.url)

        if (req.method === 'POST' && pathname === '/chat'){
            const { messages } = await req.json() as { messages: ChatMessage[] };
            const service = getNextService();

            console.log(`Using ${service?.name} service:`);
            const stream = await service?.chat(messages)

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }
        return new Response("Not Found", { status:404 });
    }
})

console.log(`Servidor corriendo en ${server.url}:${server.port}`)
