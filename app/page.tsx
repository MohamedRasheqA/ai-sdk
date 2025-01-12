'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function Chat() {
  // You can pass a unique identifier for each user
  // In a real app, this would come from authentication
  const [userId] = useState(() => Math.random().toString(36).substring(7));

  // Log the userId when it's generated
  console.log('Generated userId:', userId);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: {
      userId, // Pass userId to the API route
    },
  });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(m => (
        <div key={m.id} className="whitespace-pre-wrap">
          {m.role === 'user' ? 'User: ' : 'AI: '}
          {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
