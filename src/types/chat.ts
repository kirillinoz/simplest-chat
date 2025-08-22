import type { FileReference } from "../utils/fileStorage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: FileReference[]; // Changed from File[] to FileReference[]
  model?: GeminiModel;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  geminiApiKey?: string;
  selectedModel: GeminiModel;
  thinkingBudgets: Record<GeminiModel, ThinkingBudget>;
}

export type ThinkingBudget = "dynamic" | "high" | "medium" | "low" | "none";

export const GEMINI_MODELS = {
  "gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest model for simple tasks",
    defaultThinking: "none" as ThinkingBudget,
    thinkingRange: { min: 512, max: 24576 },
    canDisableThinking: true,
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    description: "Fast and versatile for most tasks",
    defaultThinking: "dynamic" as ThinkingBudget,
    thinkingRange: { min: 0, max: 24576 },
    canDisableThinking: true,
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    description: "Most capable model for complex tasks",
    defaultThinking: "dynamic" as ThinkingBudget,
    thinkingRange: { min: 128, max: 32768 },
    canDisableThinking: false,
  },
} as const;

export type GeminiModel = keyof typeof GEMINI_MODELS;
