'use server';

/**
 * @fileOverview Suggests starting questions for new users to understand the chatbot's capabilities.
 *
 * - suggestStartingQuestions - A function that suggests starting questions.
 * - SuggestStartingQuestionsInput - The input type for the suggestStartingQuestions function (empty object).
 * - SuggestStartingQuestionsOutput - The return type for the suggestStartingQuestions function (array of strings).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestStartingQuestionsInputSchema = z.object({});
export type SuggestStartingQuestionsInput = z.infer<typeof SuggestStartingQuestionsInputSchema>;

const SuggestStartingQuestionsOutputSchema = z.array(z.string());
export type SuggestStartingQuestionsOutput = z.infer<typeof SuggestStartingQuestionsOutputSchema>;

export async function suggestStartingQuestions(input: SuggestStartingQuestionsInput): Promise<SuggestStartingQuestionsOutput> {
  return suggestStartingQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStartingQuestionsPrompt',
  input: {schema: SuggestStartingQuestionsInputSchema},
  output: {schema: SuggestStartingQuestionsOutputSchema},
  prompt: `You are an AI chatbot expert. Suggest a few example questions that a new user could ask to understand the chatbot's capabilities. Return the questions as a JSON array of strings.`,
});

const suggestStartingQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestStartingQuestionsFlow',
    inputSchema: SuggestStartingQuestionsInputSchema,
    outputSchema: SuggestStartingQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
