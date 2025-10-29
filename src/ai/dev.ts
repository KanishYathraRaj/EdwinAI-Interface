import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/suggest-starting-questions.ts';
import '@/ai/flows/chat.ts';
