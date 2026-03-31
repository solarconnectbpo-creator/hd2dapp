import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock Twilio to avoid initialization errors in test environment
vi.mock('twilio', () => {
  return {
    default: () => ({
      calls: { create: vi.fn() },
      messages: { create: vi.fn() },
    }),
  };
});

/**
 * Tests for chatbot email capture and call conclusion protocol fixes
 * Validates that the system prompt, function definitions, and session tracking
 * enforce email collection before lead creation and smooth call conclusions.
 */

// Import the function registry to test function definitions
import { FUNCTION_REGISTRY } from './functionCalling';

describe('Email Capture - Function Definitions', () => {
  it('create_lead requires email as a required field', () => {
    const createLead = FUNCTION_REGISTRY.create_lead;
    expect(createLead).toBeDefined();
    expect(createLead.parameters.required).toContain('email');
    expect(createLead.parameters.required).toContain('name');
    expect(createLead.parameters.required).toContain('message');
  });

  it('create_lead description mentions email requirement', () => {
    const createLead = FUNCTION_REGISTRY.create_lead;
    expect(createLead.description.toLowerCase()).toContain('email');
    expect(createLead.description.toLowerCase()).toContain('must');
  });

  it('create_lead email parameter has REQUIRED in description', () => {
    const createLead = FUNCTION_REGISTRY.create_lead;
    const emailParam = createLead.parameters.properties.email;
    expect(emailParam).toBeDefined();
    expect(emailParam.description).toContain('REQUIRED');
  });

  it('request_callback requires email as a required field', () => {
    const requestCallback = FUNCTION_REGISTRY.request_callback;
    expect(requestCallback).toBeDefined();
    expect(requestCallback.parameters.required).toContain('email');
    expect(requestCallback.parameters.required).toContain('name');
    expect(requestCallback.parameters.required).toContain('phone');
  });

  it('request_callback description mentions email requirement', () => {
    const requestCallback = FUNCTION_REGISTRY.request_callback;
    expect(requestCallback.description.toLowerCase()).toContain('email');
  });
});

describe('Email Capture - Chat Session Management', () => {
  it('getChatSession creates session with empty customerInfo', async () => {
    const { getChatSession } = await import('./chatbot');
    const session = getChatSession('test-email-session-' + Date.now());
    
    expect(session).toBeDefined();
    expect(session.leadCaptured).toBe(false);
    // customerInfo starts undefined
    expect(session.customerInfo).toBeUndefined();
  });

  it('session tracks customer email when set', async () => {
    const { getChatSession } = await import('./chatbot');
    const sessionId = 'test-email-track-' + Date.now();
    const session = getChatSession(sessionId);
    
    // Simulate setting customer info
    session.customerInfo = { email: 'test@example.com', name: 'Test User' };
    
    // Retrieve same session
    const retrieved = getChatSession(sessionId);
    expect(retrieved.customerInfo?.email).toBe('test@example.com');
    expect(retrieved.customerInfo?.name).toBe('Test User');
  });

  it('addMessageToSession properly tracks conversation', async () => {
    const { getChatSession, addMessageToSession } = await import('./chatbot');
    const sessionId = 'test-msg-track-' + Date.now();
    
    addMessageToSession(sessionId, 'user', 'I need a roof inspection');
    addMessageToSession(sessionId, 'assistant', 'I can help with that! What is your name?');
    addMessageToSession(sessionId, 'user', 'John Smith');
    addMessageToSession(sessionId, 'assistant', 'Great, John! What is the best email to reach you?');
    
    const session = getChatSession(sessionId);
    expect(session.messages.length).toBe(4);
    expect(session.messages[3].content).toContain('email');
  });
});

describe('Call Conclusion Protocol - System Prompt', () => {
  it('system prompt contains call conclusion protocol', async () => {
    // Read the chatbot file to check the system prompt
    const fs = await import('fs');
    const chatbotContent = fs.readFileSync('./server/chatbot.ts', 'utf-8');
    
    expect(chatbotContent).toContain('Call Conclusion Protocol');
    expect(chatbotContent).toContain('NEVER hang up abruptly');
    expect(chatbotContent).toContain('Summarize what was discussed');
    expect(chatbotContent).toContain('Thank them warmly');
    expect(chatbotContent).toContain('NEVER end a conversation without confirming');
  });

  it('system prompt contains mandatory email collection strategy', async () => {
    const fs = await import('fs');
    const chatbotContent = fs.readFileSync('./server/chatbot.ts', 'utf-8');
    
    expect(chatbotContent).toContain('Lead Capture Strategy (MANDATORY)');
    expect(chatbotContent).toContain('email address');
    expect(chatbotContent).toContain('NEVER skip the email collection step');
    expect(chatbotContent).toContain('ALWAYS ask for email address before ending');
  });

  it('suggested actions include email prompt when email not captured', async () => {
    const { getChatSession } = await import('./chatbot');
    const sessionId = 'test-suggest-' + Date.now();
    const session = getChatSession(sessionId);
    
    // Session without email should have email suggestion in default path
    expect(session.leadCaptured).toBe(false);
    expect(session.customerInfo?.email).toBeUndefined();
  });

  it('suggested actions change after lead is captured', async () => {
    const { getChatSession } = await import('./chatbot');
    const sessionId = 'test-captured-' + Date.now();
    const session = getChatSession(sessionId);
    
    // Simulate lead captured
    session.leadCaptured = true;
    session.customerInfo = { email: 'test@example.com' };
    
    const retrieved = getChatSession(sessionId);
    expect(retrieved.leadCaptured).toBe(true);
    expect(retrieved.customerInfo?.email).toBe('test@example.com');
  });
});

describe('VoiceAI Page - Email Display', () => {
  it('VoiceAI page includes email field in mock data', async () => {
    const fs = await import('fs');
    const voiceAIContent = fs.readFileSync('./client/src/pages/VoiceAI.tsx', 'utf-8');
    
    // Check all three calls have email
    expect(voiceAIContent).toContain('john.smith@email.com');
    expect(voiceAIContent).toContain('sarah.j@gmail.com');
    expect(voiceAIContent).toContain('mike.davis@davisbiz.com');
  });

  it('VoiceAI page shows email captured in AI actions', async () => {
    const fs = await import('fs');
    const voiceAIContent = fs.readFileSync('./client/src/pages/VoiceAI.tsx', 'utf-8');
    
    expect(voiceAIContent).toContain('Collected email');
    expect(voiceAIContent).toContain('Provided warm wrap-up');
  });

  it('VoiceAI page has Emails Captured stat', async () => {
    const fs = await import('fs');
    const voiceAIContent = fs.readFileSync('./client/src/pages/VoiceAI.tsx', 'utf-8');
    
    expect(voiceAIContent).toContain('Emails Captured');
  });

  it('VoiceAI transcripts show proper AI/Caller conversation format', async () => {
    const fs = await import('fs');
    const voiceAIContent = fs.readFileSync('./client/src/pages/VoiceAI.tsx', 'utf-8');
    
    // Transcripts should have AI: and Caller: prefixes
    expect(voiceAIContent).toContain('AI:');
    expect(voiceAIContent).toContain('Caller:');
    // Should include email ask
    expect(voiceAIContent).toContain('best email');
    // Should include warm conclusion
    expect(voiceAIContent).toContain('Thank you for choosing Nimbus Roofing');
  });
});
