import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import { ApiKeySetup } from "../components/ApiKeySetup";
import { Sidebar } from "../components/Sidebar";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { MessageSkeleton } from "../components/MessageSkeleton";

export const Route = createFileRoute("/")({
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
