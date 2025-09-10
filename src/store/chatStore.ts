import { Store } from '@tanstack/react-store';
import type {
  Chat,
  Message,
  AppSettings,
  GeminiModel,
  ThinkingBudget,
  SettingsMode,
  ResponseStyle,
} from '../types/chat';
import { RESPONSE_STYLES } from '../types/chat';
import { storage } from '../utils/storage';
import { initializeGemini, sendMessageToGeminiStream } from '../utils/gemini';
import type { FileReference } from '../utils/fileStorage';
import { fileStorage } from '../utils/fileStorage';

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  streamingMessageId: string | null;
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

  setSettingsMode: (mode: SettingsMode) => {
    const settings = { ...chatStore.state.settings, settingsMode: mode };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setModel: (model: GeminiModel) => {
    const settings = { ...chatStore.state.settings, selectedModel: model };
    storage.saveSettings(settings);
    chatStore.setState((prev) => ({ ...prev, settings }));
  },

  setThinkingBudget: (model: GeminiModel, budget: ThinkingBudget) => {
    chatStore.setState((prev) => {
      const newThinkingBudgets = {
        ...prev.settings.thinkingBudgets,
        [model]: budget,
      };

      // Check if current combination matches a response style
      const currentTemp = prev.settings.temperature;
      const matchingStyle = Object.entries(RESPONSE_STYLES).find(
        ([_, style]) =>
          style.thinkingBudget === budget &&
          Math.abs(style.temperature - currentTemp) < 0.05
      );

      const newSettings = {
        ...prev.settings,
        thinkingBudgets: newThinkingBudgets,
        responseStyle: matchingStyle
          ? (matchingStyle[0] as ResponseStyle)
          : prev.settings.responseStyle,
      };

      // Save to storage
      storage.saveSettings(newSettings);

      return {
        ...prev,
        settings: newSettings,
      };
    });
  },

  setTemperature: (temperature: number) => {
    chatStore.setState((prev) => {
      // Check if current combination matches a response style
      const currentThinking =
        prev.settings.thinkingBudgets[prev.settings.selectedModel];
      const matchingStyle = Object.entries(RESPONSE_STYLES).find(
        ([_, style]) =>
          style.thinkingBudget === currentThinking &&
          Math.abs(style.temperature - temperature) < 0.05
      );

      const newSettings = {
        ...prev.settings,
        temperature,
        responseStyle: matchingStyle
          ? (matchingStyle[0] as ResponseStyle)
          : prev.settings.responseStyle,
      };

      // Save to storage
      storage.saveSettings(newSettings);

      return {
        ...prev,
        settings: newSettings,
      };
    });
  },

  setResponseStyle: (responseStyle: ResponseStyle) => {
    const style = RESPONSE_STYLES[responseStyle];

    chatStore.setState((prev) => {
      const newSettings = {
        ...prev.settings,
        responseStyle,
        thinkingBudgets: {
          ...prev.settings.thinkingBudgets,
          [prev.settings.selectedModel]: style.thinkingBudget,
        },
        temperature: style.temperature,
      };

      // Save to storage
      storage.saveSettings(newSettings);

      return {
        ...prev,
        settings: newSettings,
      };
    });
  },

  replaceMessagePair: async (
    userMessageId: string,
    newContent: string,
    newAttachments: FileReference[],
    newSettings: {
      model: GeminiModel;
      thinkingBudget: ThinkingBudget;
      temperature: number;
    }
  ) => {
    const { chats, currentChatId } = chatStore.state;
    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;

    const userMessageIndex = chat.messages.findIndex(
      (m) => m.id === userMessageId
    );
    if (userMessageIndex === -1) return;

    const messagesAfter = chat.messages.slice(userMessageIndex + 2);

    // --- 2. Clean Up Attachments from Messages to be Deleted ---
    const attachmentsToDelete = messagesAfter.flatMap(
      (msg) => msg.attachments || []
    );
    if (attachmentsToDelete.length > 0) {
      try {
        await Promise.all(
          attachmentsToDelete.map((ref) => fileStorage.deleteFile(ref.id))
        );
      } catch (error) {
        console.error(
          'Failed to delete attachments from subsequent messages:',
          error
        );
      }
    }

    const originalUserMessage = chat.messages[userMessageIndex];
    const assistantMessage = chat.messages[userMessageIndex + 1];

    if (!assistantMessage) return;

    // --- 1. Optimistic UI Update ---
    const newTimestamp = new Date();
    chatStore.setState((prev) => {
      const updatedChats = prev.chats.map((c) => {
        if (c.id !== currentChatId) return c;

        // Take only the messages up to the point of editing
        const messagesToKeep = c.messages.slice(0, userMessageIndex + 2);

        // Replace user message with new content immediately
        messagesToKeep[userMessageIndex] = {
          ...originalUserMessage,
          content: newContent,
          attachments: newAttachments,
          timestamp: newTimestamp,
        };
        // Clear assistant content to prepare for streaming
        messagesToKeep[userMessageIndex + 1] = {
          ...assistantMessage,
          content: '',
        };
        return { ...c, messages: messagesToKeep };
      });

      return {
        ...prev,
        chats: updatedChats,
        isLoading: true,
        streamingMessageId: assistantMessage.id, // Start streaming on assistant message
        error: null,
      };
    });

    const startTime = Date.now();

    try {
      const history = chat.messages.slice(0, userMessageIndex).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const files = await Promise.all(
        newAttachments.map(async (ref) => await fileStorage.getFile(ref.id))
      ).then((files) => files.filter(Boolean) as File[]);

      let responseContent = '';
      await sendMessageToGeminiStream(
        newContent,
        history,
        files,
        newSettings.model,
        newSettings.thinkingBudget,
        newSettings.temperature,
        (chunk) => {
          responseContent += chunk;
          chatActions.updateStreamingMessage(
            assistantMessage.id,
            responseContent
          );
        }
      );

      chatStore.setState((prev) => {
        const updatedChats = prev.chats.map((c) => {
          if (c.id !== currentChatId) return c;
          const updatedMessages = [...c.messages];
          updatedMessages[userMessageIndex + 1] = {
            ...assistantMessage,
            content: responseContent,
            timestamp: newTimestamp,
            model: newSettings.model,
            thinkingBudget: newSettings.thinkingBudget,
            temperature: newSettings.temperature,
            responseTimeMs: Date.now() - startTime,
          };
          return { ...c, messages: updatedMessages };
        });
        storage.saveChats(updatedChats);
        return { ...prev, chats: updatedChats };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get response.';
      console.error('Error replacing message pair:', error);

      chatStore.setState((prev) => {
        // Find the original full chat from the previous state
        const originalChat = prev.chats.find((c) => c.id === currentChatId);
        if (!originalChat) return prev;

        // Restore the original full message list
        const updatedChats = prev.chats.map((c) =>
          c.id === currentChatId ? { ...c, messages: chat.messages } : c
        );
        return { ...prev, chats: updatedChats, error: errorMessage };
      });
    } finally {
      chatStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        streamingMessageId: null,
      }));
    }
  },
  createNewChat: () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
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

  deleteMessagePair: async (chatId: string, userMessageId: string) => {
    const { chats } = chatStore.state;
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const userMessageIndex = chat.messages.findIndex(
      (m) => m.id === userMessageId
    );
    if (userMessageIndex === -1) return;

    const userMessage = chat.messages[userMessageIndex];
    const assistantMessage = chat.messages[userMessageIndex + 1];

    // Clean up attachments first using Promise.all
    if (userMessage.attachments && userMessage.attachments.length > 0) {
      try {
        await Promise.all(
          userMessage.attachments.map((ref) => fileStorage.deleteFile(ref.id))
        );
      } catch (error) {
        console.error('Failed to delete one or more attachments:', error);
        // We can still proceed to delete the message from the UI
      }
    }

    // Now, update the state synchronously
    chatStore.setState((prev) => {
      const messagesToDelete = [userMessage.id];
      if (assistantMessage?.role === 'assistant') {
        messagesToDelete.push(assistantMessage.id);
      }

      const updatedMessages = prev.chats
        .find((c) => c.id === chatId)
        ?.messages.filter((m) => !messagesToDelete.includes(m.id));

      if (!updatedMessages) return prev;

      const updatedChats = prev.chats.map((c) =>
        c.id === chatId ? { ...c, messages: updatedMessages } : c
      );
      storage.saveChats(updatedChats);
      return { ...prev, chats: updatedChats };
    });
  },

  deleteChat: async (chatId: string) => {
    const { chats } = chatStore.state;

    // Find the chat to be deleted to get all its attachments
    const chatToDelete = chats.find((chat) => chat.id === chatId);

    // Clean up all file attachments from all messages in this chat
    if (chatToDelete) {
      try {
        const allAttachments = chatToDelete.messages.flatMap(
          (message) => message.attachments || []
        );

        await Promise.all(
          allAttachments.map(async (ref) => {
            await fileStorage.deleteFile(ref.id);
          })
        );
      } catch (error) {
        console.error('Error deleting chat attachments:', error);
      }
    }

    const updatedChats = chats.filter((chat) => chat.id !== chatId);
    storage.saveChats(updatedChats);

    const currentChatId =
      chatStore.state.currentChatId === chatId
        ? updatedChats.length > 0
          ? updatedChats[0].id
          : null
        : chatStore.state.currentChatId;

    if (currentChatId) {
      storage.setCurrentChatId(currentChatId);
    }

    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
      currentChatId,
    }));
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

  clearAllData: async (): Promise<void> => {
    try {
      // Clear all files from our project's IndexedDB
      await fileStorage.clearAll();
      console.log('Project files cleared from IndexedDB');
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }

    // Clear ALL localStorage data
    localStorage.clear();

    // Reset store to initial state
    const defaultSettings: AppSettings = {
      geminiApiKey: '',
      selectedModel: 'gemini-2.5-flash',
      thinkingBudgets: {
        'gemini-2.5-flash-lite': 'low',
        'gemini-2.5-flash': 'medium',
        'gemini-2.5-pro': 'high',
      },
      temperature: 0.7,
      settingsMode: 'simple',
      responseStyle: 'balanced',
    };

    // Save the default settings back to localStorage
    storage.saveSettings(defaultSettings);

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

    const startTime = Date.now(); // Track start time

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
        role: 'user',
        content,
        timestamp: new Date(),
        attachments: fileReferences, // Store references
        model: settings.selectedModel,
      };

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      const currentThinkingBudget =
        settings.thinkingBudgets[settings.selectedModel];
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '', // Start empty
        timestamp: new Date(),
        model: settings.selectedModel,
        thinkingBudget: currentThinkingBudget, // Store the thinking budget used
        temperature: settings.temperature, // Store the temperature used
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
          role: msg.role === 'user' ? 'user' : 'model',
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
              ?.content || '';

          chatActions.updateStreamingMessage(
            assistantMessageId,
            currentContent + chunk
          );
        }
      );

      // Calculate response time and update the message
      const responseTime = Date.now() - startTime;
      chatActions.updateMessageResponseTime(assistantMessageId, responseTime);

      chatActions.finishStreamingMessage();
    } catch (error) {
      console.error('Error sending message:', error);
      chatStore.setState((prev) => ({
        ...prev,
        isLoading: false,
        streamingMessageId: null,
        error:
          error instanceof Error ? error.message : 'Failed to send message',
      }));
    }
  },

  setBranchedMessages: (chatId: string, messages: Message[]) => {
    const { chats } = chatStore.state;
    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: messages.map((msg) => ({
              ...msg,
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new IDs
            })),
            title:
              messages.length > 0
                ? `${messages[0].content.substring(0, 50)} (Copy)`
                : 'Branched Chat',
            updatedAt: new Date(),
          }
        : chat
    );

    storage.saveChats(updatedChats);
    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
      currentChatId: chatId,
    }));
    storage.setCurrentChatId(chatId);
  },

  removeMessage: async (chatId: string, messageId: string) => {
    const { chats } = chatStore.state;

    // Find the message to get its attachments before deleting
    const chat = chats.find((c) => c.id === chatId);
    const messageToDelete = chat?.messages.find((msg) => msg.id === messageId);

    // Clean up file attachments
    if (messageToDelete?.attachments) {
      try {
        await Promise.all(
          messageToDelete.attachments.map(async (ref) => {
            await fileStorage.deleteFile(ref.id);
          })
        );
      } catch (error) {
        console.error('Error deleting files:', error);
      }
    }

    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: chat.messages.filter((msg) => msg.id !== messageId),
            updatedAt: new Date(),
          }
        : chat
    );

    storage.saveChats(updatedChats);
    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
    }));
  },

  removeMessages: (chatId: string, messageIds: string[]) => {
    const { chats } = chatStore.state;
    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: chat.messages.filter(
              (msg) => !messageIds.includes(msg.id)
            ),
            updatedAt: new Date(),
          }
        : chat
    );

    storage.saveChats(updatedChats);
    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
    }));
  },

  updateMessageResponseTime: (messageId: string, responseTimeMs: number) => {
    const { chats } = chatStore.state;
    const updatedChats = chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((msg) =>
        msg.id === messageId ? { ...msg, responseTimeMs } : msg
      ),
    }));

    chatStore.setState((prev) => ({
      ...prev,
      chats: updatedChats,
    }));
  },
};
