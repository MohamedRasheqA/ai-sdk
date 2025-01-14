'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Settings, Plus, MessageCircle, FileText, Send, Menu, X, Loader, Users, Volume2, VolumeX, Mic, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface PersonaSelectorProps {
  selectedPersona: string;
  onPersonaChange: (persona: string) => void;
}

interface TTSControlsProps {
  messageContent: string;
  messageId: string;
  isEnabled: boolean;
}

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to access microphone');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
      }
    } catch (err) {
      setError('Failed to process audio');
      console.error('Error processing audio:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`p-2 rounded-full transition-colors ${
          isRecording ? 'bg-red-500' : 'bg-gray-100'
        } hover:bg-opacity-90 disabled:opacity-50`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        {isProcessing ? (
          <Loader className="w-4 h-4 animate-spin text-gray-600" />
        ) : isRecording ? (
          <Square className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};

const TTSControls: React.FC<TTSControlsProps> = ({ messageContent, messageId, isEnabled }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const togglePlayback = async () => {
    if (isLoading || !isEnabled) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);
  
  if (!isEnabled) return null;
  
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={`p-2 rounded-full transition-colors ${
          isPlaying ? 'bg-[#4FD1C5]' : 'bg-gray-100'
        } hover:bg-[#45B8AE] disabled:opacity-50`}
        title={isPlaying ? 'Stop' : 'Play'}
      >
        {isLoading ? (
          <Loader className="w-4 h-4 animate-spin text-gray-600" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500">Failed to play audio</span>
      )}
      
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setError('Audio playback failed');
          setIsPlaying(false);
        }}
      />
    </div>
  );
};

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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4FD1C5]" />
  </div>
);

export default function ChatPage() {
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionSelected, setIsQuestionSelected] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('general');

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages, setInput } = useChat({
    api: '/api/chat',
    body: { 
      userId,
      persona: selectedPersona,
      tts: isTTSEnabled
    },
    onResponse: (response) => {
      console.log('Response started:', response);
      setError(null);
      setIsQuestionSelected(false);
    }
  });

  const startPracticeScenario = async () => {
    const startMessage = "Start a practice scenario for pharmacy consultation. Act as an interviewer and give me a relevant scenario to respond to.";
    setInput(startMessage);
    
    try {
      const fakeEvent = new Event('submit') as unknown as React.FormEvent<HTMLFormElement>;
      await handleSubmit(fakeEvent);
    } catch (error) {
      console.error('Error starting practice scenario:', error);
      setError('Failed to start practice scenario');
    }
  };

  const frequentQuestions = [
    "Tell me about Pharmacy specialty solutions from the perspective of a start consultant",
    "What is the cost of Tufts Center for the Study of Drug Development claims?",
    "What is the cost to develop a drug according to the study by JAMA?",
    "Pitch to me what impact the Biosimilars Market has",
    "What formulary options are available?"
  ];

  const handleQuestionClick = async (question: string) => {
    setInput(question);
    setShowFAQs(false);
    setIsQuestionSelected(true);
    
    try {
      const fakeEvent = new Event('submit') as unknown as React.FormEvent<HTMLFormElement>;
      await handleSubmit(fakeEvent);
    } catch (error) {
      console.error('Error submitting FAQ question:', error);
      setError('Failed to process your request');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedPersona === 'roleplay' && messages.length === 0) {
      startPracticeScenario();
    }
  }, [selectedPersona]);

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
    setShowButtons(true);
    setSelectedPersona('general');
    setError(null);
  };

  const handlePracticeClick = () => {
    setSelectedPersona('roleplay');
    setShowButtons(false);
    setShowFAQs(false);
    startPracticeScenario();
  };

  const handleFAQsClick = () => {
    setShowFAQs(!showFAQs);
  };

  const toggleTTS = () => {
    setIsTTSEnabled(!isTTSEnabled);
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
            <Link href="/" className="flex items-center space-x-2 mb-8">
              <img src="Side-text.png" alt="Logo" className="w-30 h-10" />
            </Link>
            
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
              onClick={toggleTTS}
              className={`p-2 rounded-full transition-colors ${
                isTTSEnabled ? 'bg-[#4FD1C5] text-white' : 'bg-gray-100 text-gray-600'
              } hover:bg-[#45B8AE]`}
              title={isTTSEnabled ? 'Disable Text-to-Speech' : 'Enable Text-to-Speech'}
            >
              {isTTSEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
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
                  {m.role === 'assistant' && (
                    <div className="mt-2">
                      <TTSControls 
                        messageContent={m.content} 
                        messageId={m.id} 
                        isEnabled={isTTSEnabled}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                  <LoadingSpinner />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area with Persona Selector and Voice Input */}
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
              <VoiceRecorder
                onTranscription={(text) => {
                  setInput(text);
                  setIsQuestionSelected(true);
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !isQuestionSelected)}
                className={`bg-[#E56B8C] text-white px-3 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#D15A7B] transition-colors ${
                  (!input.trim() && !isQuestionSelected) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <LoadingSpinner />
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