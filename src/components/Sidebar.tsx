import { Plus, MessageSquare, Trash2, Edit3, Check, X } from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { SettingsPopover } from "./SettingsPopover";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useRef, useEffect } from "react";

const truncateTitle = (title: string, maxLength: number = 25) => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength).trim() + "...";
};

export const Sidebar = () => {
  const { chats, currentChatId } = useStore(chatStore);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingChatId]);

  const startEditing = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const saveTitle = () => {
    if (editingChatId && editingTitle.trim()) {
      chatActions.renameChatTitle(editingChatId, editingTitle.trim());
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  return (
    <div className="w-80 bg-theme-muted text-theme-foreground flex flex-col h-screen border-r border-theme-border">
      {/* Logo */}
      <div className="p-4 flex-shrink-0 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Simplest Chat"
            className="h-8 w-8 flex-shrink-0"
          />
          <h1 className="text-lg font-bold">Simplest Chat</h1>
        </div>
      </div>

      {/* Header with New Chat button */}
      <div className="p-4 flex-shrink-0">
        <Button
          onClick={chatActions.createNewChat}
          className="w-full justify-start bg-theme-background hover:bg-theme-muted text-theme-foreground border-0 btn-primary"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Scrollable chat list */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentChatId === chat.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-theme-background bg-theme-background/50"
              }`}
              onClick={() => {
                if (editingChatId !== chat.id) {
                  chatActions.selectChat(chat.id);
                }
              }}
              title={editingChatId === chat.id ? undefined : chat.title}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />

              {editingChatId === chat.id ? (
                // Editing mode
                <div className="flex-1 flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveTitle}
                    className="flex-1 bg-transparent text-theme-foreground text-sm font-normal leading-normal px-0 py-0 border-none focus:border-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-0 rounded-sm"
                    maxLength={100}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveTitle();
                    }}
                    className="h-6 w-6 p-0 hover:bg-theme-muted text-chart-2 hover:text-chart-2/80 flex-shrink-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEditing();
                    }}
                    className="h-6 w-6 p-0 hover:bg-theme-muted text-destructive hover:text-destructive/80 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                // Display mode
                <>
                  <span
                    className={`flex-1 text-sm min-w-0 truncate ${
                      currentChatId === chat.id ? "font-bold" : "font-normal"
                    }`}
                  >
                    {truncateTitle(chat.title)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(chat.id, chat.title);
                      }}
                      className="h-6 w-6 p-0 hover:bg-theme-muted text-theme-muted-foreground hover:text-theme-foreground flex-shrink-0"
                      title="Rename chat"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        chatActions.deleteChat(chat.id);
                      }}
                      className="h-6 w-6 p-0 hover:bg-theme-muted text-theme-muted-foreground hover:text-destructive flex-shrink-0"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {chats.length === 0 && (
            <div className="text-center py-8 text-theme-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Settings and Theme Toggle */}
      <div className="flex-shrink-0">
        <Separator className="bg-theme-border" />
        <div className="px-2 py-3 flex items-center justify-between">
          <SettingsPopover />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
