import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { GEMINI_MODELS, type GeminiModel } from "../types/chat";
import { Bot } from "lucide-react";

export const ModelSelector = () => {
  const { settings } = useStore(chatStore);

  const handleModelChange = (model: GeminiModel) => {
    chatActions.setModel(model);
  };

  return (
    <div className="flex items-center gap-2">
      <Bot className="h-4 w-4 text-primary" />
      <Select value={settings.selectedModel} onValueChange={handleModelChange}>
        <SelectTrigger className="w-44 h-8 text-sm border-theme-border">
          <SelectValue>
            {GEMINI_MODELS[settings.selectedModel]?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-theme-background border-theme-border">
          {Object.entries(GEMINI_MODELS).map(([key, model]) => (
            <SelectItem key={key} value={key}>
              <div className="flex flex-col text-left">
                <span className="font-medium text-theme-foreground">
                  {model.name}
                </span>
                <span className="text-xs text-theme-muted-foreground">
                  {model.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
