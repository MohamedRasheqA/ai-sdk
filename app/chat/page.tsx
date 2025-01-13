'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Settings, Plus, MessageCircle, FileText, Send, Menu, X, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { userId },
    onResponse: (response) => {
      console.log('Response started:', response);
      setError(null);
    }
  });

  const frequentQuestions = [
    "Tell me about your services",
    "How do I schedule an appointment?",
    "What are your working hours?"
  ];

  const handleQuestionClick = (question: string) => {
    const syntheticEvent = {
      preventDefault: () => {},
      target: {
        elements: {
          message: { value: question }
        }
      }
    } as unknown as React.FormEvent<HTMLFormElement>;
    
    handleSubmit(syntheticEvent);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
      await handleSubmit(e);
    } catch (error) {
      console.error('Error submitting question:', error);
      setError('Failed to process your request');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden absolute top-4 left-4 z-50 text-slate-600"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-[#4FD1C5] text-white transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-8">
              <img src="Side-text.png" alt="Logo" className="w-30 h-10" />
            </div>
            
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle size={20} className="text-white" />
                <span className="text-white font-medium">Recent Chats</span>
              </div>
              <div className="text-sm">
                {messages.length > 0 && (
                  <div className="p-2 hover:bg-[#45B8AE] rounded transition-colors cursor-pointer">
                    Last conversation
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-auto p-4">
            <button className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors">
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
          <h2 className="text-xl text-[#2D3748] ml-12 lg:ml-0">Chat Assistant</h2>
          <div className="flex space-x-2 sm:space-x-4">
            <button className="bg-[#E56B8C] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#D15A7B] transition-colors">
              <Plus size={20} />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button className="bg-[#4FD1C5] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#45B8AE] transition-colors">
              <FileText size={20} />
              <span className="hidden sm:inline">Documents</span>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-50">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center my-4 sm:my-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[#2D3748]">👋 Welcome to Acolyte Health Support</h2>
              <p className="text-slate-600 mb-4 sm:mb-8">How can I help you today?</p>
              
              <div className="max-w-2xl mx-auto px-2 sm:px-0">
                <h3 className="text-left text-lg font-semibold mb-4 text-[#2D3748]">Frequently Asked Questions</h3>
                <div className="grid gap-3 sm:gap-4">
                  {frequentQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionClick(question)}
                      className="text-left p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-[#4FD1C5] hover:shadow-sm transition-all flex items-center space-x-2"
                    >
                      <MessageCircle size={20} className="text-[#E56B8C] flex-shrink-0" />
                      <span className="text-slate-700 text-sm sm:text-base">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-lg shadow-sm ${
                    m.role === 'user'
                      ? 'bg-[#E56B8C] text-white'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <div className="text-sm sm:text-base prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-[#4FD1C5]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-2 sm:p-4 border-t border-slate-200 bg-white">
          <form onSubmit={enhancedSubmit} className="flex space-x-2 sm:space-x-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message here..."
              className="flex-1 p-2 sm:p-3 text-sm sm:text-base border border-slate-200 rounded-md focus:outline-none focus:border-[#4FD1C5] focus:ring-1 focus:ring-[#4FD1C5]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#E56B8C] text-white px-3 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#D15A7B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-20 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4"
          >
            <span className="text-red-500">&times;</span>
          </button>
        </div>
      )}
    </div>
  );
}