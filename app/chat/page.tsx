'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Settings, Plus, MessageCircle, FileText, Send, Menu, X, Loader2, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PersonaSelectorProps {
  selectedPersona: string;
  onPersonaChange: (persona: string) => void;
}

const PersonaSelector = ({ selectedPersona, onPersonaChange }: PersonaSelectorProps) => {
  return (
    <div className="flex items-center space-x-2 px-2">
      <Users size={20} className="text-gray-500" />
      <select
        value={selectedPersona}
        onChange={(e) => onPersonaChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-md p-1 focus:outline-none focus:border-[#4FD1C5] focus:ring-1 focus:ring-[#4FD1C5]"
      >
        <option value="general">General</option>
        <option value="roleplay">Role Play</option>
      </select>
    </div>
  );
};

export default function ChatPage() {
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionSelected, setIsQuestionSelected] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('general');

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages, setInput } = useChat({
    api: '/api/chat',
    body: { 
      userId,
      persona: selectedPersona
    },
    onResponse: (response) => {
      console.log('Response started:', response);
      setError(null);
      setIsQuestionSelected(false);
    }
  });

  const frequentQuestions = [
    "Tell me about Pharmacy specialty solutions from the perspective of a start consultant",
    "What is the cost of Tufts Center for the Study of Drug Development claims?",
    "What is the cost to develop a drug according to the study by JAMA?",
    "Pitch to me what impact the Biosimilars Market has",
    "What formulary options are available?"
  ];

  const handleQuestionClick = (question: string) => {
    setInput(question);
    setShowFAQs(false);
    setIsQuestionSelected(true);
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

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    setMessages([]);
    setInput('');
    setShowFAQs(false);
    setIsQuestionSelected(false);
  };

  const handlePracticeClick = () => {
    setShowButtons(false);
    setShowFAQs(false);
  };

  const handleFAQsClick = () => {
    setShowFAQs(!showFAQs);
  };

  const customHandleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    setIsQuestionSelected(!!e.target.value.trim());
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
        w-64 bg-gray-100 text-gray-800 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-8">
              <img src="Side-text.png" alt="Logo" className="w-30 h-10" />
            </div>
            
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle size={20} className="text-gray-700" />
                <span className="text-gray-700 font-medium">Recent Chats</span>
              </div>
              <div className="text-sm">
                {messages.length > 0 && (
                  <div className="p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer">
                    Last conversation
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
          <h2 className="text-xl text-[#2D3748] ml-12 lg:ml-0">Chat Assistant</h2>
          <div className="flex space-x-2 sm:space-x-4">
            <button 
              onClick={handleNewChat}
              className="bg-[#4FD1C5] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#45B8AE] transition-colors">
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
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[#2D3748]">👋 Hi There!</h2>
              <p className="text-slate-600 mb-8">
                I am here to help you practice and refine your skills to confidently discuss pharmacy fundamentals, 
                plan design basics, the marketplace, and the role of PBMs.
              </p>
              
              <div className="max-w-2xl mx-auto px-2 sm:px-0">
                {/* Main Action Buttons */}
                {showButtons && (
                  <div className="flex justify-center space-x-6 mb-8">
                    <button 
                      onClick={handlePracticeClick}
                      className="bg-[#4FD1C5] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#45B8AE] transition-colors"
                    >
                      <FileText size={20} />
                      <span className="hidden sm:inline">Practice</span>
                    </button>
                    <button 
                      onClick={handleFAQsClick}
                      className="bg-[#4FD1C5] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#45B8AE] transition-colors"
                    >
                      <MessageCircle size={20} />
                      <span className="hidden sm:inline">FAQs</span>
                    </button>
                  </div>
                )}

                {/* FAQ Questions */}
                {showFAQs && (
                  <div className="mt-8">
                    <h3 className="text-left text-lg font-semibold mb-4 text-[#2D3748]">Common Questions</h3>
                    <div className="grid gap-3 sm:gap-4">
                      {frequentQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuestionClick(question)}
                          className="text-left p-4 bg-white rounded-lg border border-slate-200 hover:border-[#4FD1C5] hover:shadow-sm transition-all flex items-start space-x-3"
                        >
                          <MessageCircle size={20} className="text-[#E56B8C] flex-shrink-0 mt-1" />
                          <span className="text-slate-700 text-sm sm:text-base">{question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

        {/* Input Area with Persona Selector */}
        <div className="p-2 sm:p-4 border-t border-slate-200 bg-white">
          <form onSubmit={enhancedSubmit} className="space-y-2">
            <div className="flex items-center space-x-2">
              <PersonaSelector
                selectedPersona={selectedPersona}
                onPersonaChange={setSelectedPersona}
              />
            </div>
            <div className="flex space-x-2 sm:space-x-4">
              <input
                value={input}
                onChange={customHandleInputChange}
                placeholder={`Type your message here... (${selectedPersona} mode)`}
                className="flex-1 p-2 sm:p-3 text-sm sm:text-base border border-slate-200 rounded-md focus:outline-none focus:border-[#4FD1C5] focus:ring-1 focus:ring-[#4FD1C5]"
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !isQuestionSelected)}
                className={`bg-[#E56B8C] text-white px-3 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#D15A7B] transition-colors ${
                  (!input.trim() && !isQuestionSelected) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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
            </div>
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