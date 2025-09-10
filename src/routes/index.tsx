import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { chatStore, chatActions } from '../store/chatStore';
import { ApiKeySetup } from '../components/ApiKeySetup';
import { Sidebar } from '../components/Sidebar';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { MessageSkeleton } from '../components/MessageSkeleton';
import type { GeminiModel, Message, ThinkingBudget } from '@/types/chat';
import { useState } from 'react';
import { RetryDialog } from '@/components/RetryDialog';
import type { FileReference } from '@/utils/fileStorage';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export const Route = createFileRoute('/')({
  component: ChatApp,
});

function ChatApp() {
  const {
    settings,
    chats,
    currentChatId,
    isLoading,
    error,
    streamingMessageId,
  } = useStore(chatStore);

  // State to manage the unified Edit & Retry dialog
  const [retryState, setRetryState] = useState<{
    open: boolean;
    userMessage?: Message;
    assistantMessage?: Message;
    subsequentMessageCount: number;
  }>({ open: false, subsequentMessageCount: 0 });

  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    messageToDelete?: Message;
  }>({ open: false });

  if (!settings.geminiApiKey) {
    return <ApiKeySetup onApiKeySet={chatActions.setApiKey} />;
  }

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  // Action handlers for ChatMessage
  const handleCopyMessage = (message: Message) => {
    // Optional: Add analytics or logging
    console.log('Message copied:', message.id);
  };

  const handleBranchConversation = (message: Message) => {
    if (!currentChat) return;

    // Find the index of the message to branch from
    const messageIndex = currentChat.messages.findIndex(
      (m) => m.id === message.id
    );

    // Create new conversation with history up to this point (including the message being branched from)
    const branchedMessages = currentChat.messages.slice(0, messageIndex + 1);

    // Create new chat with branched history
    const newChatId = chatActions.createNewChat();

    // Update the new chat with the branched messages
    chatActions.setBranchedMessages(newChatId, branchedMessages);
  };

  // This function is passed to ChatMessage and opens the dialog
  const handleOpenRetryDialog = (clickedMessage: Message) => {
    if (!currentChat) return;
    const messages = currentChat.messages;
    let userMessage: Message | undefined;
    let assistantMessage: Message | undefined;
    let subsequentMessageCount = 0; // Variable to hold the count

    const clickedIndex = messages.findIndex((m) => m.id === clickedMessage.id);

    if (clickedMessage.role === 'user') {
      userMessage = clickedMessage;
      const nextMessage = messages[clickedIndex + 1];
      if (nextMessage?.role === 'assistant') {
        assistantMessage = nextMessage;
        // Calculate messages after the user/assistant pair
        subsequentMessageCount = messages.length - (clickedIndex + 2);
      }
    } else if (clickedMessage.role === 'assistant') {
      assistantMessage = clickedMessage;
      const prevMessage = messages[clickedIndex - 1];
      if (prevMessage?.role === 'user') {
        userMessage = prevMessage;
        // Calculate messages after the assistant message
        subsequentMessageCount = messages.length - (clickedIndex + 1);
      }
    }

    // Only open the dialog if we have a valid user/assistant pair
    if (userMessage && assistantMessage) {
      setRetryState({
        open: true,
        userMessage,
        assistantMessage,
        subsequentMessageCount, // Set the count in the state
      });
    }
  };

  // This function is passed to the dialog to confirm the action
  const handleConfirmRetry = (data: {
    model: GeminiModel;
    thinkingBudget: ThinkingBudget;
    temperature: number;
    content: string;
    attachments: FileReference[]; // Receive attachments
  }) => {
    if (!retryState.userMessage) return;

    chatActions.replaceMessagePair(
      retryState.userMessage.id,
      data.content,
      data.attachments,
      {
        model: data.model,
        thinkingBudget: data.thinkingBudget,
        temperature: data.temperature,
      }
    );
    setRetryState({ open: false, subsequentMessageCount: 0 }); // Close dialog and reset count
  };

  const handleDeleteMessage = (message: Message) => {
    if (!currentChat || message.role !== 'user') return;
    setDeleteState({ open: true, messageToDelete: message });
  };

  const handleConfirmDelete = () => {
    if (!currentChat || !deleteState.messageToDelete) return;
    chatActions.deleteMessagePair(
      currentChat.id,
      deleteState.messageToDelete.id
    );
    setDeleteState({ open: false, messageToDelete: undefined }); // Close and reset
  };

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* Fixed sidebar */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {!currentChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Welcome to Gemini Chat
              </h2>
              <p className="text-muted-foreground">
                Start a new conversation to begin
              </p>
              <Button
                className="btn-primary"
                onClick={chatActions.createNewChat}
              >
                New Chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto pt-16">
                {currentChat.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={streamingMessageId === message.id}
                    onCopy={handleCopyMessage}
                    onBranch={handleBranchConversation}
                    onDelete={handleDeleteMessage}
                    onRetry={handleOpenRetryDialog}
                  />
                ))}

                {isLoading && !streamingMessageId && <MessageSkeleton />}

                {error && (
                  <div className="mx-4 my-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <ChatInput />
              </div>
            </div>
          </>
        )}
      </div>
      {/* Render the ConfirmationDialog */}
      <ConfirmationDialog
        open={deleteState.open}
        onOpenChange={(open) => setDeleteState({ ...deleteState, open })}
        title="Are you sure you want to delete this message?"
        description="This action cannot be undone and will remove the message and its response."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
      />

      {/* Render the unified dialog */}
      {retryState.open &&
        retryState.userMessage &&
        retryState.assistantMessage && (
          <RetryDialog
            open={retryState.open}
            onOpenChange={(open) =>
              setRetryState((prev) => ({ ...prev, open }))
            }
            initialContent={retryState.userMessage.content}
            initialAttachments={retryState.userMessage.attachments || []}
            initialModel={
              retryState.assistantMessage.model || settings.selectedModel
            }
            initialThinkingBudget={
              retryState.assistantMessage.thinkingBudget ||
              settings.thinkingBudgets[settings.selectedModel]
            }
            initialTemperature={
              retryState.assistantMessage.temperature || settings.temperature
            }
            subsequentMessageCount={retryState.subsequentMessageCount} // Pass the count as a prop
            onConfirm={handleConfirmRetry}
            isRetrying={isLoading}
          />
        )}
    </div>
  );
}
