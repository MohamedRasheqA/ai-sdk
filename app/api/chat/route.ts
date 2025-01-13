import { createMem0, addMemories } from '@mem0/vercel-ai-provider';
import { streamText } from 'ai';
import { Pool } from 'pg';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr.us-east-2.aws.neon.tech/documents?sslmode=require",
});

const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
  config: {
    compatibility: 'strict',
  },
});

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Function to rewrite query and generate embedding in one call
async function rewriteQueryAndGetEmbedding(query: string, previousMessages: Message[]): Promise<[string, number[]]> {
  const startTime = performance.now();
  console.log('🔄 Starting query rewrite and embedding generation...');
  
  const systemPrompt = "You are a specialized query rewriting assistant. Your task is to rewrite user questions to be more search-friendly while preserving their original intent. Focus on healthcare, pharmacy benefits, and insurance-related terminology that might appear in company documentation. Consider the conversation context when rewriting follow-up questions. Do not add any external knowledge - only reframe the question to better match potential document content.";
  
  const conversationContext = previousMessages
    .slice(-4)
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  // First LLM call - Query rewriting
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Previous conversation:\n${conversationContext}\n\nCurrent question: ${query}\n\nPlease rewrite the current question considering the context above.`
      }
    ],
    temperature: 0.7,
  });

  const rewrittenQuery = completion.choices[0].message.content || query;

  // Generate embedding for the rewritten query
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: rewrittenQuery,
  });

  const endTime = performance.now();
  const timeTaken = (endTime - startTime).toFixed(2);
  
  console.log('✨ Query rewriting complete:');
  console.log(`📝 Original: "${query}"`);
  console.log(`🔁 Rewritten: "${rewrittenQuery}"`);
  console.log(`⏱️ Time taken: ${timeTaken}ms`);

  return [rewrittenQuery, response.data[0].embedding];
}

// Function to perform similarity search
async function findSimilarContent(embedding: number[]): Promise<string> {
  const startTime = performance.now();
  console.log('🔍 Starting similarity search...');

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Invalid embedding format');
  }

  const client = await pool.connect();
  try {
    const vectorString = `[${embedding.join(',')}]`;
    
    const query = `
      SELECT contents, 1 - (vector <=> $1::vector) as similarity
      FROM documents
      WHERE 1 - (vector <=> $1::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5;
    `;
    
    const result = await client.query(query, [vectorString]);
    
    const endTime = performance.now();
    const timeTaken = (endTime - startTime).toFixed(2);
    
    console.log(`📊 Found ${result.rows.length} relevant documents`);
    console.log(`⏱️ Search time: ${timeTaken}ms`);
    
    if (result.rows.length === 0) {
      return "No relevant content found in the documentation.";
    }
    
    return result.rows.map(row => row.contents).join('\n\n');
  } finally {
    client.release();
  }
}

export const maxDuration = 30;


export async function POST(req: Request) {
  const totalStartTime = performance.now(); // Add overall timer at the start
  try {
    console.log('🚀 Starting request processing...');
    const { messages, userId } = await req.json();
    const userQuery = messages[messages.length - 1].content;
    const previousMessages = messages.slice(0, -1);

    // Step 1: Rewrite query and get embedding in one call
    const [rewrittenQuery, embedding] = await rewriteQueryAndGetEmbedding(userQuery, previousMessages);

    // Step 2: Find similar content from the database
    const similarContent = await findSimilarContent(embedding);

    // Step 3: Start response generation
    const responseStartTime = performance.now();
    console.log('💭 Starting response generation...');

    // Prepare system message and messages array for streaming response
    const systemPrompt = `You are a specialized document-based assistant. Your responses must be strictly based on the provided context and conversation history. Do not use external knowledge or make assumptions beyond what is explicitly stated in the context. If the context doesn't contain relevant information to answer the question, respond with 'I don't have enough information in the provided documentation to answer this question.' Format any numerical data, statistics, or specific terms exactly as they appear in the context. If referring to previous responses, ensure they were based on the documented content.

Documentation Context: ${similarContent}`;

    const updatedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...previousMessages.map((msg: Message) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: userQuery }
    ];

    // Log the start of streaming
    console.log('📡 Initiating response stream...');
    
    // Step 3: Stream the response using ai-sdk
    const result = await streamText({
      model: mem0('gpt-4o-mini', {
        user_id: userId,
      }),
      messages: updatedMessages,
    });

    const responseEndTime = performance.now();
    const streamInitTime = (responseEndTime - responseStartTime).toFixed(2);
    const totalTime = (responseEndTime - totalStartTime).toFixed(2);
    
    console.log(`⏱️ Stream initialization time: ${streamInitTime}ms`);
    console.log(`⌛ Total processing time: ${totalTime}ms`);

    // Add memories after streaming starts
    const finalMessages = [...updatedMessages];
    await addMemories(finalMessages, {
      user_id: userId,
      mem0ApiKey: process.env.MEM0_API_KEY,
    });

    console.log('✅ Request processing complete!');
    return result.toDataStreamResponse();
  } catch (error) {
    const errorTime = performance.now();
    const totalErrorTime = (errorTime - totalStartTime).toFixed(2);
    console.error(`❌ Error in chat route (after ${totalErrorTime}ms):`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}