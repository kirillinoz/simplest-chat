import type { Chat, AppSettings, ThinkingBudget } from "../types/chat";
import { GEMINI_MODELS } from "../types/chat";

const STORAGE_KEYS = {
  CHATS: "gemini-chats",
  SETTINGS: "gemini-settings",
  CURRENT_CHAT: "current-chat-id",
};

export const storage = {
  getChats(): Chat[] {
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    return chats
      ? JSON.parse(chats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            model: msg.model || undefined,
          })),
        }))
      : [];
  },

  saveChats(chats: Chat[]): void {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  },

  getCurrentChatId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);
  },

  setCurrentChatId(chatId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, chatId);
  },

  getSettings(): AppSettings {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = settings ? JSON.parse(settings) : {};

    // Create default thinking budgets for all models
    const defaultThinkingBudgets: Record<string, ThinkingBudget> = {};
    Object.entries(GEMINI_MODELS).forEach(([key, model]) => {
      defaultThinkingBudgets[key] = model.defaultThinking;
    });

    return {
      selectedModel: "gemini-2.5-flash",
      thinkingBudgets: defaultThinkingBudgets,
      ...parsed,
    };
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
};
