// app/api/stt/route.ts
import { OpenAI } from 'openai';
import { writeFile } from 'fs/promises';
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

    // Convert File to Buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the file temporarily
    const filename = `temp-${Date.now()}.webm`;
    await writeFile(filename, buffer);

    // Transcribe using OpenAI Whisper with English language specification
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], filename, { type: 'audio/webm' }),
      model: 'whisper-1',
      language: 'en', // Explicitly set English language
      response_format: 'json',
      prompt: 'Please transcribe this audio in English only'
    });

    // Clean up the temporary file
    const fs = require('fs').promises;
    await fs.unlink(filename);

    return new Response(JSON.stringify({ text: transcription.text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('STT Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to convert speech to text' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}