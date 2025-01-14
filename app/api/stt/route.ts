// app/api/stt/route.ts
import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert File to Blob and create a new File object
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
    const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json',
      prompt: 'Please transcribe this audio in English only'
    });

    return new Response(JSON.stringify({ text: transcription.text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('STT Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to convert speech to text',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Configure API route options for Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};