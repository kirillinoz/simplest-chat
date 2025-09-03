export type GeminiModel =
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro';

export type ThinkingBudget = 'dynamic' | 'high' | 'medium' | 'low' | 'none';

export type TemperatureOption = {
  value: number;
  label: string;
  description: string;
};

export type ResponseStyle =
  | 'analytical'
  | 'creative'
  | 'balanced'
  | 'concise'
  | 'instant';

export type SettingsMode = 'simple' | 'simplest';

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
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    description: 'Fastest model for simple tasks',
    thinkingRange: { min: 0, max: 8192 },
    defaultThinking: 'low',
    maxTokens: 8192,
    supportedFeatures: ['thinking', 'vision'],
    canDisableThinking: true,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    description: 'Fast and versatile model for most tasks',
    thinkingRange: { min: 0, max: 32768 },
    defaultThinking: 'medium',
    maxTokens: 8192,
    supportedFeatures: ['thinking', 'vision', 'files'],
    canDisableThinking: true,
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    description: 'Most capable model for complex tasks',
    thinkingRange: { min: 0, max: 65536 },
    defaultThinking: 'high',
    maxTokens: 8192,
    supportedFeatures: ['thinking', 'vision', 'files'],
    canDisableThinking: false,
  },
};

export const THINKING_BUDGETS: Record<
  ThinkingBudget,
  { name: string; description: string }
> = {
  dynamic: {
    name: 'Dynamic',
    description:
      'Automatically adjusts thinking depth based on query complexity',
  },
  high: {
    name: 'High',
    description: 'Deep thinking for complex problems',
  },
  medium: {
    name: 'Medium',
    description: 'Balanced thinking for most tasks',
  },
  low: {
    name: 'Low',
    description: 'Quick thinking for simple questions',
  },
  none: {
    name: 'None',
    description: 'No thinking time - instant responses',
  },
};

export const TEMPERATURE_OPTIONS: TemperatureOption[] = [
  {
    value: 0.1,
    label: 'Precise',
    description: 'Most deterministic and focused',
  },
  {
    value: 0.3,
    label: 'Focused',
    description: 'Reliable with minimal variation',
  },
  {
    value: 0.5,
    label: 'Balanced',
    description: 'Good mix of consistency and variety',
  },
  {
    value: 0.7,
    label: 'Creative',
    description: 'More diverse and original',
  },
  {
    value: 0.9,
    label: 'Surprising',
    description: 'Highly creative and unexpected',
  },
];

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
    name: 'Analytical',
    description: 'Detailed, logical, and factual answers',
    thinkingBudget: 'high',
    temperature: 0.1,
  },
  creative: {
    name: 'Creative',
    description: 'Brainstorming, writing, and novel ideas',
    thinkingBudget: 'high',
    temperature: 0.9,
  },
  balanced: {
    name: 'Balanced',
    description: 'A good default for most tasks',
    thinkingBudget: 'medium',
    temperature: 0.5,
  },
  concise: {
    name: 'Concise & Factual',
    description: 'Quick, direct answers',
    thinkingBudget: 'low',
    temperature: 0.3,
  },
  instant: {
    name: 'Instant Answer',
    description: 'Fastest possible response',
    thinkingBudget: 'none',
    temperature: 0.5,
  },
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileReference[];
  model?: GeminiModel;
  thinkingBudget?: ThinkingBudget;
  temperature?: number;
  responseTimeMs?: number;
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

import type { FileReference } from '../utils/fileStorage';
