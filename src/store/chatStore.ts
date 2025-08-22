import { Store } from "@tanstack/react-store";
import type {
  Chat,
  Message,
  AppSettings,
  GeminiModel,
  ThinkingBudget,
  SettingsMode,
  ResponseStyle,
} from "../types/chat";
import { RESPONSE_STYLES } from "../types/chat";
import { storage } from "../utils/storage";
import { initializeGemini, sendMessageToGeminiStream } from "../utils/gemini";
import type { FileReference } from "../utils/fileStorage";
import { fileStorage } from "../utils/fileStorage";

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  streamingMessageId: string | null; // Track which message is streaming
}

const initialState: ChatState = {
  chats: storage.getChats(),
  currentChatId: storage.getCurrentChatId(),
  settings: storage.getSettings(),
  isLoading: false,
  error: null,
  streamingMessageId: null,
};

if (initialState.settings.geminiApiKey) {
  initializeGemini(initialState.settings.geminiApiKey);
}

export const chatStore = new Store(initialState);

export const chatActions = {
  setApiKey: (apiKey: string) => {
    const settings = { ...chatStore.state.settings, geminiApiKey: apiKey };
    storage.saveSettings(settings);
    initializeGemini(apiKey);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setModel: (model: GeminiModel) => {
    const settings = { ...chatStore.state.settings, selectedModel: model };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setThinkingBudget: (model: GeminiModel, budget: ThinkingBudget) => {
    const settings = {
      ...chatStore.state.settings,
      thinkingBudgets: {
        ...chatStore.state.settings.thinkingBudgets,
        [model]: budget,
      },
    };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setTemperature: (temperature: number) => {
    const settings = { ...chatStore.state.settings, temperature };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setSettingsMode: (mode: SettingsMode) => {
    const settings = { ...chatStore.state.settings, settingsMode: mode };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setResponseStyle: (style: ResponseStyle) => {
    const styleConfig = RESPONSE_STYLES[style];
    const settings = {
      ...chatStore.state.settings,
      responseStyle: style,
      // Update both thinking budget and temperature based on the style
      thinkingBudgets: {
        ...chatStore.state.settings.thinkingBudgets,
        [chatStore.state.settings.selectedModel]: styleConfig.thinkingBudget,
      },
      temperature: styleConfig.temperature,
    };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  createNewChat: () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only update state, don't save to storage yet
    const chats = [newChat, ...chatStore.state.chats];

    chatStore.setState((prev) => ({
      ...prev,
      chats,
      currentChatId: newChat.id,
    }));

    // Don't save to storage until first message is sent
    return newChat.id;
  },

  selectChat: (chatId: string) => {
    storage.setCurrentChatId(chatId);
    chatStore.setState((prev) => ({ ...prev, currentChatId: chatId }));
  },

  deleteChat: (chatId: string) => {
    const chats = chatStore.state.chats.filter((chat) => chat.id !== chatId);
    storage.saveChats(chats);

    const currentChatId =
      chatStore.state.currentChatId === chatId
        ? chats.length > 0
          ? chats[0].id
          : null
        : chatStore.state.currentChatId;

    if (currentChatId) {
      storage.setCurrentChatId(currentChatId);
    }

    chatStore.setState((prev) => ({ ...prev, chats, currentChatId }));
  },

  renameChatTitle: (chatId: string, newTitle: string) => {
    const { chats } = chatStore.state;
    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? { ...chat, title: newTitle, updatedAt: new Date() }
        : chat
    );

    storage.saveChats(updatedChats);
    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
    }));
  },

  updateStreamingMessage: (messageId: string, content: string) => {
    const { chats } = chatStore.state;
    const updatedChats = chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      ),
    }));

    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
    }));

    // Don't save to storage during streaming (too frequent)
  },

  finishStreamingMessage: () => {
    const { chats } = chatStore.state;
    storage.saveChats(chats); // Save final state
    chatStore.setState((prev) => ({
      ...prev,
      streamingMessageId: null,
      isLoading: false,
    }));
  },

  clearAllData: () => {
    // Reset store to initial state (without saved data)
    const defaultSettings: AppSettings = {
      geminiApiKey: "",
      selectedModel: "gemini-2.5-flash",
      thinkingBudgets: {
        "gemini-2.5-flash-lite": "low",
        "gemini-2.5-flash": "medium",
        "gemini-2.5-pro": "high",
      },
      temperature: 0.7,
      settingsMode: "simple",
      responseStyle: "balanced",
    };

    chatStore.setState(() => ({
      chats: [],
      currentChatId: null,
      settings: defaultSettings,
      isLoading: false,
      error: null,
      streamingMessageId: null,
    }));
  },

  sendMessage: async (
    content: string,
    fileReferences: FileReference[] = []
  ) => {
    if (!content.trim() && fileReferences.length === 0) return;
    const { currentChatId, chats, settings } = chatStore.state;
    if (!currentChatId) return;

    try {
      // Convert file references back to File objects for API call
      const files = await Promise.all(
        fileReferences.map(async (ref) => {
          const file = await fileStorage.getFile(ref.id);
          return file;
        })
      );

      // Filter out any null files
      const validFiles = files.filter(Boolean) as File[];

      // Create user message with file references (not File objects)
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
        attachments: fileReferences, // Store references
        model: settings.selectedModel,
      };

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "", // Start empty
        timestamp: new Date(),
        model: settings.selectedModel,
      };

      let updatedChats = chats.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage, assistantMessage],
              title:
                chat.messages.length === 0
                  ? content.substring(0, 50)
                  : chat.title,
              updatedAt: new Date(),
            }
          : chat
      );

      chatStore.setState((prev) => ({
        ...prev,
        chats: updatedChats,
        isLoading: true,
        streamingMessageId: assistantMessageId,
        error: null,
      }));

      // Now save to storage since we have actual messages
      storage.saveChats(updatedChats);
      storage.setCurrentChatId(currentChatId);

      const currentChat = updatedChats.find(
        (chat) => chat.id === currentChatId
      )!;

      // Convert conversation history (excluding the new messages)
      const conversationHistory = currentChat.messages
        .slice(0, -2) // Exclude user and assistant messages we just added
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      // Get current thinking budget and temperature
      const thinkingBudget = settings.thinkingBudgets[settings.selectedModel];
      const temperature = settings.temperature;

      await sendMessageToGeminiStream(
        content,
        conversationHistory,
        validFiles,
        settings.selectedModel,
        thinkingBudget,
        temperature, // Pass temperature to API
        (chunk: string) => {
          // Update the streaming message
          const currentContent =
            chatStore.state.chats
              .find((chat) => chat.id === currentChatId)
              ?.messages.find((msg) => msg.id === assistantMessageId)
              ?.content || "";

          chatActions.updateStreamingMessage(
            assistantMessageId,
            currentContent + chunk
          );
        }
      );

      chatActions.finishStreamingMessage();
    } catch (error) {
      console.error("Error sending message:", error);
      chatStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        streamingMessageId: null,
        error:
          error instanceof Error ? error.message : "Failed to send message",
      }));
    }
  },
};
