'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const messageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    message: z.string()
});

export const continueConversation = ai.defineFlow(
    {
        name: 'continueConversation',
        inputSchema: z.object({
            history: z.array(messageSchema),
        }),
        outputSchema: z.string(),
    },
    async ({ history }) => {

        const systemPrompt = 'You are a helpful AI assistant named Edwin. Your purpose is to assist users with their questions and tasks. Be friendly and conversational.';

        const llmResponse = await ai.generate({
            prompt: systemPrompt,
            history: history.map(m => ({
                role: m.role === 'assistant' || m.role === 'system' ? 'model' : 'user',
                content: m.message
            })),
            model: 'googleai/gemini-2.5-flash',
        });
        
        return llmResponse.text;
    }
);
