import type { ChatMessage } from './types';
import * as readline from 'node:readline';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';

// ── Terminal colors ───
const c = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    blue:    '\x1b[36m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    gray:    '\x1b[90m',
    red:     '\x1b[31m',
};

const conversationHistory: ChatMessage[] = [];

// ── Helpers ───────────
function printBanner() {
    console.clear();
    console.log(`${c.blue}${c.bold}`);
    console.log('  ║*****          BotTolomeo Chat Terminal            *****║');
    console.log(`${c.reset}${c.gray}  Conectado a: ${SERVER_URL}`);
    console.log(`  ${c.green}${c.bold} Escribe  "log out" para terminar la sesión`);
    console.log(`  ${c.green}${c.bold} Escribe  "clean" para borrar el historial`);
    console.log(`  ${c.green}${c.bold} Escribe  "history" para ver la conversación.\n${c.reset}`);
}

function printMessage(role: 'user' | 'assistant', content: string) {
    if (role === 'user') {
        console.log(`\n${c.green}${c.bold}  Tú:${c.reset} ${content}`);
    } else {
        console.log(`\n${c.blue}${c.bold}  BotTolomeo:${c.reset}`);
    }
}

function printHistory() {
    if (conversationHistory.length === 0) {
        console.log(`\n${c.gray}  (Historial vacío)${c.reset}\n`);
        return;
    }
    console.log(`\n${c.yellow}${c.bold}  ── Historial de conversación ──${c.reset}`);
    for (const msg of conversationHistory) {
        const label = msg.role === 'user'
            ? `${c.green}Tú${c.reset}`
            : `${c.blue}BotTolomeo${c.reset}`;
        const preview = msg.content.length > 50
            ? msg.content.slice(0, 80) + '…'
            : msg.content;
        console.log(`  ${c.gray}[${label}${c.gray}]${c.reset} ${preview}`);
    }
    console.log();
}

async function sendMessage(userInput: string): Promise<void> {
    conversationHistory.push({ role: 'user', content: userInput });

    let fullResponse = '';

    try {
        const res = await fetch(`${SERVER_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!res.ok) {
            console.error(`\n${c.red}  Error del servidor: ${res.status} ${res.statusText}${c.reset}\n`);
            conversationHistory.pop(); // Revertir si falló
            return;
        }

        if (!res.body) {
            console.error(`\n${c.red}  No se recibió stream del servidor${c.reset}\n`);
            return;
        }

        // Mostrar label AI y empezar a imprimir el stream en tiempo real
        process.stdout.write(`\n${c.blue}${c.bold}  BotTolomeo:${c.reset} `);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            process.stdout.write(chunk);
            fullResponse += chunk;
        }

        console.log('\n');

        // Guardar respuesta completa en el historial
        if (fullResponse.trim()) {
            conversationHistory.push({ role: 'assistant', content: fullResponse });
        }

    } catch (err: any) {
        console.error(`\n${c.red}  Error de conexión: ${err.message}${c.reset}`);
        console.error(`${c.gray}  ¿Está corriendo el servidor en ${SERVER_URL}?${c.reset}\n`);
        conversationHistory.pop(); // Revertir mensaje del usuario si falló
    }
}

// ── Main loop ────────
async function main() {
    printBanner();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });

    const prompt = () => {
        rl.question(`${c.green}${c.bold}  > ${c.reset}`, async (input) => {
            const trimmed = input.trim();

            if (!trimmed) {
                prompt();
                return;
            }

            // Comandos especiales
            if (trimmed.toLowerCase() === 'log out') {
                console.log(`\n${c.gray} Hasta luego humano! 👋${c.reset}\n`);
                rl.close();
                process.exit(0);
            }

            if (trimmed.toLowerCase() === 'clean') {
                conversationHistory.length = 0;
                printBanner();
                console.log(`${c.yellow}  Historial borrado.${c.reset}\n`);
                prompt();
                return;
            }

            if (trimmed.toLowerCase() === 'history') {
                printHistory();
                prompt();
                return;
            }

            // Enviar mensaje a la IA
            await sendMessage(trimmed);
            prompt();
        });
    };

    prompt();
}

await main();