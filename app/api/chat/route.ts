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

type Persona = 'general' | 'roleplay';

// System prompts for different personas
const SYSTEM_PROMPTS: Record<Persona, string> = {
  general: `You are a specialized assistant with the following guidelines:

1. Conversational Approach:
   - Maintain a friendly and natural dialog flow
   - Use a warm, approachable tone
   - Show genuine interest in user questions
   - Engage in a way that encourages continued conversation

2. Content Restrictions:
   - Base all responses strictly on the provided context and conversation history
   - Do not use any external knowledge
   - Avoid making assumptions beyond what is explicitly stated
   - Format numerical data and statistics exactly as they appear in the context

3. Response Guidelines:
   - When information is available: Provide accurate answers while maintaining a conversational tone
   - When information is missing: Say "I wish I could help with that, but I don't have enough information in the provided documentation to answer your question. Is there something else you'd like to know about?"
   - For follow-up questions: Verify that previous responses were based on documented content

4. Quality Standards:
   - Ensure accuracy while remaining approachable
   - Balance professionalism with conversational friendliness
   - Maintain consistency in information provided
   - Keep responses clear and engaging`,

  roleplay: `
You are a role-play assistant helping users practice and refine their health benefits consulting skills. Follow these instructions:

1. Begin by welcoming the user to this learning scenario.

2. Take on the role of a client who is purchasing pharmacy benefits. Present this scenario:
   - Express concerns about pharmacy benefits and specialty drug landscape
   - Describe employee sentiment about these issues
   - End with a specific question to the "benefits consultant" (user)

3. After presenting the scenario, add this message:
"Please respond as if you're advising me on these issues. If you'd like a different scenario or focus area, let me know!"

4. For subsequent interactions:
   - If user requests a new scenario: Generate a new one following the same structure as above
   - If user provides consulting advice: 
     - Acknowledge their response
     - Provide constructive feedback on their answer
     - Suggest improvements if applicable
     - Maintain a coaching mindset throughout

5. Stay in character unless:
   - User goes off-topic (inform them you cannot help with that)
   - User requests a different scenario (generate new one)

Sample initial response:
"Welcome to this health benefits consulting scenario! I'll play the role of a client seeking your expertise.

I'm the HR Director at a mid-sized manufacturing company, and I'm increasingly worried about our pharmacy benefits program. Our specialty drug costs have risen 30% in the last year alone, and employees are complaining about prior authorization requirements. Just last week, one of our senior engineers had to delay starting a critical medication due to PA issues. Our staff is frustrated, and I'm concerned about both costs and employee satisfaction. How can we better manage our specialty drug spending while ensuring our employees have access to the medications they need?

Please respond as if you're advising me on these issues. If you'd like a different scenario or focus area, let me know!"
`
};

// Function to get embedding for a query
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  return response.data[0].embedding;
}

// Function to find similar content from database
async function findSimilarContent(embedding: number[]): Promise<string> {
  // Format the embedding array as a PostgreSQL vector string
  const vectorString = `[${embedding.join(',')}]`;
  
  const query = `
    SELECT contents, 1 - (vector <=> $1::vector) as similarity
    FROM documents
    WHERE 1 - (vector <=> $1::vector) > 0.7
    ORDER BY similarity DESC
    LIMIT 5;
  `;
  
  const result = await pool.query(query, [vectorString]);
  return result.rows.map(row => row.contents).join('\n\n');
}

// Function to check if message is a greeting
function isGreeting(query: string): boolean {
  const greetingPatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)(\s|$)/i,
    /^(how are you|what's up|wassup|sup)(\?|\s|$)/i,
    /^(hola|bonjour|hallo|ciao)(\s|$)/i
  ];
  
  return greetingPatterns.some(pattern => pattern.test(query.trim().toLowerCase()));
}

// Function to get greeting response
function getGreetingResponse(): string {
  const greetings = [
    "👋 Hello! How can I assist you today?",
    "Hi there! 😊 What can I help you with?",
    "👋 Hey! Ready to help you with any questions!",
    "Hello! 🌟 How may I be of assistance?",
    "Hi! 😃 Looking forward to helping you today!"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export const maxDuration = 30;

function isValidPersona(persona: any): persona is Persona {
  return ['general', 'roleplay'].includes(persona);
}

export async function POST(req: Request) {
  const totalStartTime = performance.now();
  try {
    console.log('🚀 Starting request processing...');
    const { messages, userId, persona: rawPersona = 'general' } = await req.json();
    const persona = isValidPersona(rawPersona) ? rawPersona : 'general';
    const userQuery = messages[messages.length - 1].content;
    const previousMessages = messages.slice(0, -1);

    // Check if the query is a greeting
    if (isGreeting(userQuery)) {
      console.log('👋 Greeting detected, sending default response');
      const greetingResponse = getGreetingResponse();
      
      // Create a stream response for greeting
      const result = await streamText({
        model: mem0('gpt-4o-mini', {
          user_id: userId,
        }),
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS[persona], // Use persona-specific prompt even for greetings
          },
          ...previousMessages,
          {
            role: 'user',
            content: userQuery
          },
          {
            role: 'assistant',
            content: greetingResponse
          }
        ],
      });

      // Add greeting to memories
      const greetingMessages = [
        { role: 'user', content: userQuery },
        { role: 'assistant', content: greetingResponse }
      ];
      await addMemories([...previousMessages, ...greetingMessages], {
        user_id: userId,
        mem0ApiKey: process.env.MEM0_API_KEY,
      });

      console.log('👋 Greeting response sent');
      return result.toDataStreamResponse();
    }

    // If not a greeting, proceed with normal processing
    console.log('💬 Processing regular query...');
    console.log(`🎭 Using ${persona} persona`);

    // Generate embedding directly from the original query
    const embedding = await getQueryEmbedding(userQuery);

    // Find similar content from the database
    const similarContent = await findSimilarContent(embedding);

    // Start response generation
    const responseStartTime = performance.now();
    console.log('💭 Starting response generation...');

    // Get the appropriate system prompt based on persona
    const systemPrompt = `${SYSTEM_PROMPTS[persona]}

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
    
    // Stream the response using ai-sdk
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
