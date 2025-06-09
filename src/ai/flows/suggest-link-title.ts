'use server';

/**
 * @fileOverview A flow for suggesting link titles based on the content of the linked website.
 *
 * - suggestLinkTitle - A function that handles the link title suggestion process.
 * - SuggestLinkTitleInput - The input type for the suggestLinkTitle function.
 * - SuggestLinkTitleOutput - The return type for the suggestLinkTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLinkTitleInputSchema = z.object({
  url: z.string().url().describe('The URL of the website to generate a title for.'),
});
export type SuggestLinkTitleInput = z.infer<typeof SuggestLinkTitleInputSchema>;

const SuggestLinkTitleOutputSchema = z.object({
  title: z.string().describe('The suggested title for the link.'),
});
export type SuggestLinkTitleOutput = z.infer<typeof SuggestLinkTitleOutputSchema>;

export async function suggestLinkTitle(input: SuggestLinkTitleInput): Promise<SuggestLinkTitleOutput> {
  return suggestLinkTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLinkTitlePrompt',
  input: {schema: SuggestLinkTitleInputSchema},
  output: {schema: SuggestLinkTitleOutputSchema},
  prompt: `You are an AI assistant helping users create appealing titles for their links on a social media landing page.

  Based on the content of the following URL, suggest a concise and engaging title:

  URL: {{{url}}}

  Title:`,
});

const suggestLinkTitleFlow = ai.defineFlow(
  {
    name: 'suggestLinkTitleFlow',
    inputSchema: SuggestLinkTitleInputSchema,
    outputSchema: SuggestLinkTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
