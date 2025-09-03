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
import type { Message } from '@/types/chat';

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

  const handleRetryMessage = async (message: Message) => {
    if (!currentChat) return;

    // Find the user message that preceded this assistant message
    const messageIndex = currentChat.messages.findIndex(
      (m) => m.id === message.id
    );
    const userMessage = currentChat.messages[messageIndex - 1];

    if (userMessage && userMessage.role === 'user') {
      // Remove the current assistant message from the chat
      chatActions.removeMessage(currentChat.id, message.id);

      // Use the new retry action that doesn't duplicate the user message
      await chatActions.retryMessage(currentChat.id, userMessage);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!currentChat) return;

    const messageIndex = currentChat.messages.findIndex(
      (m) => m.id === message.id
    );

    // Remove the user message
    await chatActions.removeMessage(currentChat.id, message.id);

    // If there's an assistant message right after this user message, remove it too
    if (messageIndex + 1 < currentChat.messages.length) {
      const nextMessage = currentChat.messages[messageIndex + 1];
      if (nextMessage.role === 'assistant') {
        await chatActions.removeMessage(currentChat.id, nextMessage.id);
      }
    }
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
                    onRetry={handleRetryMessage}
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
    </div>
  );
}
