import { createMem0, addMemories } from '@mem0/vercel-ai-provider';
import { streamText } from 'ai';

const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
  config: {
    compatibility: 'strict',
  },
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  const result = await streamText({
    model: mem0('gpt-4o-mini', {
      user_id: userId,
    }),
    messages,
  });

  await addMemories(messages, {
    user_id: userId,
    mem0ApiKey: process.env.MEM0_API_KEY,
  });

  return result.toDataStreamResponse();
}