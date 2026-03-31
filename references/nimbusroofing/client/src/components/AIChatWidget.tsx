/**
 * AI Chat Widget - Customer-Facing Chatbot
 * 
 * Floating chat widget that appears on all pages
 * Uses function calling system to answer questions and capture leads
 */

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Loader2, Phone, Sparkles } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  functionCalls?: any[];
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get initial greeting
  const greetingQuery = trpc.chatbot.getGreeting.useQuery(undefined, {
    enabled: isOpen && messages.length === 0,
  });

  // Send message mutation
  const sendMessageMutation = trpc.chatbot.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          functionCalls: data.functionCalls,
        },
      ]);
      
      setLeadCaptured(data.leadCaptured);
      setSuggestedActions(data.suggestedActions || []);
      setIsLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting right now. Please call us at (214) 612-6696 for immediate assistance.",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    },
  });

  // Load greeting when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && greetingQuery.data) {
      setMessages([
        {
          role: 'assistant',
          content: greetingQuery.data.message,
          timestamp: new Date(),
        },
      ]);
      setSuggestedActions(greetingQuery.data.quickReplies);
    }
  }, [isOpen, greetingQuery.data, messages.length]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    
    if (!messageToSend || isLoading) return;

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: messageToSend,
        timestamp: new Date(),
      },
    ]);

    setInputMessage('');
    setIsLoading(true);

    // Send to backend
    sendMessageMutation.mutate({
      sessionId,
      message: messageToSend,
    });
  };

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          size="icon"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col overflow-hidden border-2">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-blue-700" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Nimbus AI Assistant</h3>
                <p className="text-xs text-blue-100">Powered by Google Gemini</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Lead Captured Banner */}
          {leadCaptured && (
            <div className="bg-green-50 border-b border-green-200 p-2 text-center">
              <p className="text-sm text-green-800 font-medium">
                ✓ We've got your info! Our team will reach out soon.
              </p>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    
                    {/* Function Calls Indicator */}
                    {msg.functionCalls && msg.functionCalls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs opacity-70 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Used {msg.functionCalls.length} AI tool{msg.functionCalls.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && !isLoading && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickReply(action)}
                    className="text-xs h-7"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => window.location.href = 'tel:2146126696'}
              >
                <Phone className="h-3 w-3 mr-1" />
                Call (214) 612-6696
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
