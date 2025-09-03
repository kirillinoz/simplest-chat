import { Bot } from 'lucide-react';

export const TypingIndicator = () => {
  return (
    <div className="flex gap-4 p-6 assistant-message-bg">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-theme-muted text-theme-foreground">
        <Bot size={16} />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-theme-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-theme-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-theme-muted-foreground rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-theme-muted-foreground ml-2">
            AI is typing...
          </span>
        </div>
      </div>
    </div>
  );
};
