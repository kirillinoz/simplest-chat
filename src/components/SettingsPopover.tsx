import { useState } from "react";
import { Settings, Trash2, AlertTriangle } from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { fileStorage } from "../utils/fileStorage";
import type { SettingsMode } from "../types/chat";

export const SettingsPopover = () => {
  const { settings } = useStore(chatStore);
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [isClearing, setIsClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    available: number;
  } | null>(null);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    chatActions.setApiKey(value);
  };

  const handleModeChange = (mode: SettingsMode) => {
    chatActions.setSettingsMode(mode);
  };

  const handleClearAllData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all data? This cannot be undone."
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      // Clear all localStorage
      localStorage.clear();

      // Clear IndexedDB file storage
      await fileStorage.cleanup(0); // Clear all files

      // Clear chat store
      chatActions.clearAllData();

      // Reset API key input
      setApiKey("");

      alert("All data has been cleared.");
    } catch (error) {
      console.error("Error clearing data:", error);
      alert("Failed to clear all data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const updateStorageInfo = async () => {
    const info = await fileStorage.getStorageInfo();
    setStorageInfo(info);
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          updateStorageInfo();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-theme-muted text-theme-muted-foreground hover:text-theme-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-theme-background" align="end">
        <div className="p-4">
          <h3 className="font-semibold text-theme-foreground mb-4">Settings</h3>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 tabs-list">
              <TabsTrigger value="general" className="tabs-trigger">
                General
              </TabsTrigger>
              <TabsTrigger value="interface" className="tabs-trigger">
                Interface
              </TabsTrigger>
              <TabsTrigger value="storage" className="tabs-trigger">
                Storage
              </TabsTrigger>
            </TabsList>

            {/* Fixed height container for all tab content */}
            <div className="min-h-[280px]">
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="api-key"
                    className="text-sm font-medium text-theme-foreground"
                  >
                    Gemini API Key
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your API key"
                    className="bg-theme-background border-theme-border"
                  />
                  <p className="text-xs text-theme-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-chart-1 hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="interface" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-theme-foreground">
                    Settings Mode
                  </Label>

                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-theme-muted/30">
                      <input
                        type="radio"
                        name="settingsMode"
                        value="simple"
                        checked={settings.settingsMode === "simple"}
                        onChange={() => handleModeChange("simple")}
                        className="text-primary mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-theme-foreground">
                          Simple Mode
                        </div>
                        <div className="text-xs text-theme-muted-foreground mt-1">
                          Separate controls for thinking budget and creativity
                          level. Full control over model behavior.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-theme-muted/30">
                      <input
                        type="radio"
                        name="settingsMode"
                        value="simplest"
                        checked={settings.settingsMode === "simplest"}
                        onChange={() => handleModeChange("simplest")}
                        className="text-primary mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-theme-foreground">
                          Simplest Mode
                        </div>
                        <div className="text-xs text-theme-muted-foreground mt-1">
                          Preset response styles for common use cases. Quick
                          selection without technical details.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 p-3 bg-theme-muted/30 rounded-lg">
                    <div className="text-xs text-theme-muted-foreground">
                      <strong>Current:</strong>{" "}
                      {settings.settingsMode === "simple"
                        ? "Simple"
                        : "Simplest"}{" "}
                      Mode
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="storage" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {/* Storage Usage Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-theme-foreground">
                      Storage Usage
                    </Label>
                    {storageInfo ? (
                      <div className="p-3 bg-theme-muted/30 rounded-lg">
                        <div className="text-xs text-theme-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Used:</span>
                            <span>
                              {(storageInfo.used / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Available:</span>
                            <span>
                              {(storageInfo.available / (1024 * 1024)).toFixed(
                                1
                              )}{" "}
                              MB
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-theme-muted/30 rounded-lg">
                        <div className="text-xs text-theme-muted-foreground">
                          Loading storage info...
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-theme-border" />

                  {/* Data Management Section */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-theme-foreground">
                      Data Management
                    </Label>

                    <div className="space-y-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-8 text-xs btn-destructive"
                        onClick={handleClearAllData}
                        disabled={isClearing}
                      >
                        {isClearing ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border border-destructive-foreground border-t-transparent mr-2"></div>
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-2" />
                            Clear All Data
                          </>
                        )}
                      </Button>

                      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-xs text-destructive-foreground flex items-start">
                          <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          This will permanently delete all chats and files.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
};
