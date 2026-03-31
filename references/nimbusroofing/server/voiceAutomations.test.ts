import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';

// Mock Twilio to avoid initialization errors
vi.mock('twilio', () => ({
  default: () => ({
    calls: { create: vi.fn() },
    messages: { create: vi.fn() },
  }),
}));

describe('AI Voice Pricing Page', () => {
  const content = fs.readFileSync('./client/src/pages/AIVoicePricing.tsx', 'utf-8');

  it('displays the $49.99/month pricing', () => {
    expect(content).toContain('$49.99');
    expect(content).toContain('/month');
  });

  it('includes all echowin features', () => {
    expect(content).toContain('1,600 credits/month');
    expect(content).toContain('Dedicated US/Canada number');
    expect(content).toContain('AI Voice Agent');
    expect(content).toContain('AI Chatbot');
    expect(content).toContain('Business Compass');
    expect(content).toContain('30+ languages');
    expect(content).toContain('7000+ integrations');
    expect(content).toContain('Real-time call transcription');
    expect(content).toContain('24/7 customer support');
    expect(content).toContain('No setup fees');
  });

  it('has email capture input fields', () => {
    expect(content).toContain('email');
    expect(content).toContain('Enter your email');
    expect(content).toContain('handleGetStarted');
  });

  it('includes testimonials', () => {
    expect(content).toContain('Sean Porcher');
    expect(content).toContain('David O\'Hara');
    expect(content).toContain('5X More Appointments');
    expect(content).toContain('90% Calls Automated');
  });

  it('includes FAQ section', () => {
    expect(content).toContain('Common Questions');
    expect(content).toContain('credit system');
    expect(content).toContain('long-term contract');
  });

  it('has trusted by section', () => {
    expect(content).toContain('Trusted by 1,000+');
    expect(content).toContain('Jiffy Lube');
    expect(content).toContain('Farmers Insurance');
  });

  it('includes navigation links', () => {
    expect(content).toContain('/voice-ai');
    expect(content).toContain('/automations');
  });
});

describe('Automations Catalog Page', () => {
  const content = fs.readFileSync('./client/src/pages/AutomationsCatalog.tsx', 'utf-8');

  it('has all 6 categories', () => {
    expect(content).toContain('Suggested for You');
    expect(content).toContain('Lead Management');
    expect(content).toContain('Insurance Claims');
    expect(content).toContain('Operations');
    expect(content).toContain('Marketing');
    expect(content).toContain('Compliance & Safety');
  });

  it('includes roofing-specific automations', () => {
    expect(content).toContain('Notify crew when emergency lead comes in');
    expect(content).toContain('Auto-generate Xactimate scope sheet');
    expect(content).toContain('Schedule crew based on weather forecast');
    expect(content).toContain('Post storm alert to social media');
    expect(content).toContain('Building code update alerts');
  });

  it('includes email capture automation', () => {
    expect(content).toContain('Collect email before ending AI call');
  });

  it('has search functionality', () => {
    expect(content).toContain('searchQuery');
    expect(content).toContain('Search automations');
  });

  it('shows integration partners', () => {
    expect(content).toContain('Google Calendar');
    expect(content).toContain('CompanyCam');
    expect(content).toContain('Xactimate');
    expect(content).toContain('Make.com');
    expect(content).toContain('Zapier');
  });

  it('has email capture CTA', () => {
    expect(content).toContain('Enter your email');
    expect(content).toContain('handleGetStarted');
  });

  it('includes activate button for automations', () => {
    expect(content).toContain('handleActivate');
    expect(content).toContain('Activate');
  });

  it('includes popular badges', () => {
    expect(content).toContain('popular');
    expect(content).toContain('Popular');
  });
});

describe('App Routes', () => {
  const appContent = fs.readFileSync('./client/src/App.tsx', 'utf-8');

  it('has route for AI Voice Pricing page', () => {
    expect(appContent).toContain('/ai-voice-pricing');
    expect(appContent).toContain('AIVoicePricing');
  });

  it('has route for Automations Catalog page', () => {
    expect(appContent).toContain('/automations');
    expect(appContent).toContain('AutomationsCatalog');
  });

  it('has route for Voice AI dashboard', () => {
    expect(appContent).toContain('/voice-ai');
    expect(appContent).toContain('VoiceAI');
  });
});

describe('VoiceAI Email Capture Updates', () => {
  const content = fs.readFileSync('./client/src/pages/VoiceAI.tsx', 'utf-8');

  it('shows email in call data', () => {
    expect(content).toContain('john.smith@email.com');
    expect(content).toContain('sarah.j@gmail.com');
    expect(content).toContain('mike.davis@davisbiz.com');
  });

  it('has Emails Captured stat', () => {
    expect(content).toContain('Emails Captured');
  });

  it('shows email captured badge in AI actions', () => {
    expect(content).toContain('Collected email');
  });

  it('shows warm wrap-up in AI actions', () => {
    expect(content).toContain('Provided warm wrap-up');
  });

  it('transcripts show proper conversation format', () => {
    expect(content).toContain('AI:');
    expect(content).toContain('Caller:');
    expect(content).toContain('best email');
    expect(content).toContain('Thank you for choosing Nimbus Roofing');
  });
});
