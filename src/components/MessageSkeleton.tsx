import { Bot } from "lucide-react";

export const MessageSkeleton = () => {
  return (
    <div className="flex gap-4 p-6 assistant-message-bg">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-theme-muted text-theme-foreground flex items-center justify-center">
        <Bot size={16} />
      </div>
      <div className="flex-1 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-theme-muted rounded animate-pulse"></div>
          <div className="h-4 bg-theme-muted rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-theme-muted rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    </div>
  );
};
