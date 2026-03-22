import Constants from "expo-constants";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResponse {
  success: boolean;
  message?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

type ExpoAiExtra = {
  openaiApiKey?: string;
  model?: string;
  temperature?: string | number;
  maxTokens?: string | number;
};

type OpenAIApiErrorBody = {
  error?: { message?: string };
};

type ChatCompletionResponse = {
  choices: Array<{ message: { content: string } }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

function parseEnvNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseEnvInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function getExpoExtra(): ExpoAiExtra | undefined {
  return Constants.expoConfig?.extra as ExpoAiExtra | undefined;
}

function normalizeImageDataUrl(imageData: string): string {
  if (imageData.startsWith("data:")) return imageData;
  return `data:image/jpeg;base64,${imageData}`;
}

async function postOpenAIJson<T>(url: string, body: unknown, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & OpenAIApiErrorBody;
  if (!res.ok) {
    const msg = data?.error?.message?.trim() || `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function formatRequestError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error occurred";
}

class OpenAIService {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL = "https://api.openai.com/v1";
  private conversationHistory: OpenAIMessage[] = [];

  constructor() {
    const extra = getExpoExtra();
    this.apiKey = extra?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";
    this.model = extra?.model ?? process.env.EXPO_PUBLIC_MODEL ?? "gpt-4";
    this.temperature = parseEnvNumber(
      extra?.temperature ?? process.env.EXPO_PUBLIC_TEMPERATURE,
      0.7,
    );
    this.maxTokens = parseEnvInt(extra?.maxTokens ?? process.env.EXPO_PUBLIC_MAX_TOKENS, 2000);

    if (!this.apiKey) {
      console.error("OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in .env");
    }
  }

  /**
   * Send a message to ChatGPT and get a response
   */
  async chat(
    userMessage: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void,
  ): Promise<OpenAIResponse> {
    try {
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      const messages: OpenAIMessage[] = [];

      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt,
        });
      }

      messages.push(...this.conversationHistory);

      const response = await postOpenAIJson<ChatCompletionResponse>(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
        },
        this.apiKey,
      );

      const assistantMessage = response.choices[0].message.content as string;

      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      if (onChunk) {
        onChunk(assistantMessage);
      }

      return {
        success: true,
        message: assistantMessage,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      const errorMessage = formatRequestError(error);
      console.error("OpenAI API Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): OpenAIMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Analyze roof image and generate report (uses vision-capable message payload).
   */
  async analyzeRoofImage(imageData: string, context?: string): Promise<OpenAIResponse> {
    const systemPrompt = `You are an expert roof inspector AI. Analyze the provided roof image and generate a comprehensive report including:
    1. Overall roof condition assessment (Good/Fair/Poor)
    2. Type of roof material identified
    3. Visible damage or wear patterns
    4. Recommended repairs (if any)
    5. Estimated maintenance priority (Low/Medium/High)
    6. Safety concerns (if any)

    Be professional and detailed in your analysis.`;

    const userText = `Please analyze this roof image and provide a detailed inspection report.${
      context ? ` Additional context: ${context}` : ""
    }`;

    try {
      const visionModel = /gpt-4o|gpt-4-turbo|gpt-4\.1|vision/i.test(this.model)
        ? this.model
        : "gpt-4o";

      const response = await postOpenAIJson<ChatCompletionResponse>(
        `${this.baseURL}/chat/completions`,
        {
          model: visionModel,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                {
                  type: "image_url",
                  image_url: { url: normalizeImageDataUrl(imageData) },
                },
              ],
            },
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        },
        this.apiKey,
      );

      const assistantMessage = response.choices[0].message.content as string;

      this.conversationHistory.push({
        role: "user",
        content: userText,
      });
      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      return {
        success: true,
        message: assistantMessage,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      const errorMessage = formatRequestError(error);
      console.error("OpenAI API Error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async generateRepairPlan(roofCondition: string, issues: string[]): Promise<OpenAIResponse> {
    const systemPrompt = `You are an expert roof repair specialist. Generate a detailed repair plan based on the roof assessment. Include:
    1. Priority ranking of repairs
    2. Estimated costs (general range)
    3. Timeline for repairs
    4. Preventative measures
    5. Tools and materials needed

    Format as a professional report.`;

    const userMessage = `Create a repair plan for a roof with condition: "${roofCondition}" and issues: ${issues.join(", ")}`;

    return this.chat(userMessage, systemPrompt);
  }

  async generateMaintenanceSchedule(roofAge: number, roofType: string): Promise<OpenAIResponse> {
    const systemPrompt = `You are a roof maintenance expert. Create a comprehensive maintenance schedule. Include:
    1. Monthly tasks
    2. Seasonal tasks
    3. Annual inspections
    4. Major maintenance milestones
    5. Warning signs to watch for

    Format as a practical guide.`;

    const userMessage = `Generate a maintenance schedule for a ${roofAge}-year-old ${roofType} roof.`;

    return this.chat(userMessage, systemPrompt);
  }

  async askRoofQuestion(question: string): Promise<OpenAIResponse> {
    const systemPrompt = `You are a knowledgeable roof consultant. Answer questions about roof inspection, repair, maintenance, and materials. Be professional, accurate, and helpful.`;

    return this.chat(question, systemPrompt);
  }

  async estimateRepairCost(
    roofSize: number,
    roofType: string,
    repairType: string,
  ): Promise<OpenAIResponse> {
    const systemPrompt = `You are a roof repair cost estimator. Provide realistic cost estimates based on market rates. Include:
    1. Material costs
    2. Labor costs
    3. Equipment costs
    4. Total estimated cost range
    5. Factors that might affect pricing`;

    const userMessage = `Estimate repair costs for: ${roofSize} sq ft ${roofType} roof, repair type: ${repairType}`;

    return this.chat(userMessage, systemPrompt);
  }
}

export default OpenAIService;
