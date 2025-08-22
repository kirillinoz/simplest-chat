import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { Key, Check, Eye, EyeOff, Settings, Trash2 } from "lucide-react";

export const SettingsPopover = () => {
  const { settings } = useStore(chatStore);
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      chatActions.setApiKey(apiKey.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Failed to set API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "*".repeat(key.length);
    return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset form when opening
      setApiKey(settings.geminiApiKey || "");
      setShowApiKey(false);
      setIsSaved(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all data?\n\nThis will delete:\n• All chat conversations\n• API key\n• All settings\n• File uploads\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    setIsClearing(true);

    try {
      // Clear all localStorage
      localStorage.clear();

      // Clear sessionStorage as well
      sessionStorage.clear();

      // Clear any IndexedDB stores (if you're using any)
      if ("indexedDB" in window) {
        try {
          // This will clear file storage if you're using IndexedDB
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map((db) => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                  deleteReq.onsuccess = () => resolve(undefined);
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
        } catch (error) {
          console.warn("Could not clear IndexedDB:", error);
        }
      }

      // Clear the store state
      chatActions.clearAllData?.();

      // Show success message briefly before reload
      alert("All data cleared successfully!");

      // Reload the page to reset the application state
      window.location.reload();
    } catch (error) {
      console.error("Error clearing data:", error);
      alert("Error clearing data. Please try again.");
      setIsClearing(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="justify-start text-theme-muted-foreground hover:text-theme-foreground hover:bg-theme-muted h-8"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span className="text-sm">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[80vh] overflow-y-auto bg-theme-background border-theme-border"
        align="end"
        side="right"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-theme-foreground" />
            <h3 className="font-semibold text-sm text-theme-foreground">
              Settings
            </h3>
          </div>

          <Separator className="bg-theme-border" />

          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-theme-muted-foreground" />
              <Label className="text-sm font-medium text-theme-foreground">
                API Key
              </Label>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter your Gemini API key"
                  className="pr-8 text-xs h-8 bg-theme-background border-theme-border text-theme-foreground"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-theme-muted-foreground hover:text-theme-foreground hover:bg-theme-muted"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {settings.geminiApiKey && (
                <p className="text-xs text-theme-muted-foreground">
                  Current:{" "}
                  <code className="bg-theme-muted text-theme-foreground px-1 rounded text-xs">
                    {maskApiKey(settings.geminiApiKey)}
                  </code>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  !apiKey.trim() ||
                  isLoading ||
                  apiKey === settings.geminiApiKey
                }
                className="flex items-center gap-2 text-xs h-7"
                size="sm"
              >
                {isSaved ? (
                  <>
                    <Check className="h-3 w-3" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>

              {apiKey !== (settings.geminiApiKey || "") && (
                <Button
                  variant="outline"
                  onClick={() => setApiKey(settings.geminiApiKey || "")}
                  className="text-xs h-7 border-theme-border hover:bg-theme-muted"
                  size="sm"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="text-xs text-theme-muted-foreground space-y-1">
              <p>
                • Get your key from{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-chart-1 hover:text-chart-1/80 underline"
                >
                  Google AI Studio
                </a>
              </p>
              <p>• Stored locally in your browser</p>
            </div>
          </div>

          <Separator className="bg-theme-border" />

          {/* App Info Section */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-theme-foreground">About</h4>
            <div className="space-y-1 text-xs text-theme-muted-foreground">
              <div className="flex justify-between">
                <span>Version:</span>
                <code className="bg-theme-muted text-theme-foreground px-1 rounded text-xs">
                  1.0.0
                </code>
              </div>
              <div className="flex justify-between">
                <span>Storage:</span>
                <span>Local Browser</span>
              </div>
              <div className="flex justify-between">
                <span>Models:</span>
                <span>Gemini 2.5 Family</span>
              </div>
            </div>
          </div>

          <Separator className="bg-theme-border" />

          {/* Danger Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive text-sm">
                  Clear All Data
                </p>
                <p className="text-xs text-destructive/80">
                  Delete all chats and settings
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs btn-destructive"
                onClick={handleClearAllData}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1 text-theme-background" />
                    Clear
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
