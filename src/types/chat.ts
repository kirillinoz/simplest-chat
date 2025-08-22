export type GeminiModel =
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro";

export type ThinkingBudget = "dynamic" | "high" | "medium" | "low" | "none";

export type ResponseStyle =
  | "analytical"
  | "creative"
  | "balanced"
  | "concise"
  | "instant";

export type SettingsMode = "simple" | "simplest";

export interface ModelConfig {
  name: string;
  description: string;
  thinkingRange: { min: number; max: number };
  defaultThinking: ThinkingBudget;
  maxTokens: number;
  supportedFeatures: string[];
  canDisableThinking: boolean;
}

export const GEMINI_MODELS: Record<GeminiModel, ModelConfig> = {
  "gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest model for simple tasks",
    thinkingRange: { min: 0, max: 8192 },
    defaultThinking: "low",
    maxTokens: 8192,
    supportedFeatures: ["thinking", "vision"],
    canDisableThinking: true,
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    description: "Fast and versatile model for most tasks",
    thinkingRange: { min: 0, max: 32768 },
    defaultThinking: "medium",
    maxTokens: 8192,
    supportedFeatures: ["thinking", "vision", "files"],
    canDisableThinking: true,
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    description: "Most capable model for complex tasks",
    thinkingRange: { min: 0, max: 65536 },
    defaultThinking: "high",
    maxTokens: 8192,
    supportedFeatures: ["thinking", "vision", "files"],
    canDisableThinking: false,
  },
};

export const RESPONSE_STYLES: Record<
  ResponseStyle,
  {
    name: string;
    description: string;
    thinkingBudget: ThinkingBudget;
    temperature: number;
  }
> = {
  analytical: {
    name: "Analytical",
    description: "Detailed, logical, and factual answers",
    thinkingBudget: "high",
    temperature: 0.2,
  },
  creative: {
    name: "Creative",
    description: "Brainstorming, writing, and novel ideas",
    thinkingBudget: "high",
    temperature: 0.8,
  },
  balanced: {
    name: "Balanced",
    description: "A good default for most tasks",
    thinkingBudget: "medium",
    temperature: 0.5,
  },
  concise: {
    name: "Concise & Factual",
    description: "Quick, direct answers",
    thinkingBudget: "low",
    temperature: 0.3,
  },
  instant: {
    name: "Instant Answer",
    description: "Fastest possible response",
    thinkingBudget: "none",
    temperature: 0.4,
  },
};

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: FileReference[];
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
  geminiApiKey: string;
  selectedModel: GeminiModel;
  thinkingBudgets: Record<GeminiModel, ThinkingBudget>;
  temperature: number;
  settingsMode: SettingsMode;
  responseStyle: ResponseStyle;
}

import type { FileReference } from "../utils/fileStorage";
