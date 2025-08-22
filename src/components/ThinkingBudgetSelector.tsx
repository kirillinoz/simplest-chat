import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { GEMINI_MODELS, type ThinkingBudget } from "../types/chat";
import { Brain } from "lucide-react";

export const ThinkingBudgetSelector = () => {
  const { settings } = useStore(chatStore);
  const currentModel = settings.selectedModel;
  const currentBudget = settings.thinkingBudgets[currentModel];
  const modelInfo = GEMINI_MODELS[currentModel];

  const handleBudgetChange = (budget: ThinkingBudget) => {
    chatActions.setThinkingBudget(currentModel, budget);
  };

  const getBudgetDisplayName = (budget: ThinkingBudget) => {
    switch (budget) {
      case "dynamic":
        return "Dynamic";
      case "high":
        return "High";
      case "medium":
        return "Medium";
      case "low":
        return "Low";
      case "none":
        return "None";
    }
  };

  const getBudgetDescription = (budget: ThinkingBudget) => {
    const { max } = modelInfo.thinkingRange;
    switch (budget) {
      case "dynamic":
        return "Model decides based on complexity";
      case "high":
        return `${max} tokens - Most detailed reasoning`;
      case "medium":
        return `${Math.floor((max * 2) / 3)} tokens - Balanced reasoning`;
      case "low":
        return `${Math.floor(max / 3)} tokens - Quick reasoning`;
      case "none":
        return "0 tokens - No thinking, fastest response";
    }
  };

  const getAvailableOptions = (): ThinkingBudget[] => {
    const baseOptions: ThinkingBudget[] = ["dynamic", "high", "medium", "low"];

    // Add "none" option only if the model supports disabling thinking
    if (modelInfo.canDisableThinking) {
      return [...baseOptions, "none"];
    }

    return baseOptions;
  };

  const availableOptions = getAvailableOptions();

  return (
    <div className="flex items-center gap-2">
      <Brain className="h-4 w-4 text-primary" />
      <Select value={currentBudget} onValueChange={handleBudgetChange}>
        <SelectTrigger className="w-28 h-8 text-sm border-theme-border">
          <SelectValue>{getBudgetDisplayName(currentBudget)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-theme-background border-theme-border">
          {availableOptions.map((budget) => (
            <SelectItem key={budget} value={budget}>
              <div className="flex flex-col text-left">
                <span className="font-medium text-theme-foreground">
                  {getBudgetDisplayName(budget)}
                </span>
                <span className="text-xs text-theme-muted-foreground">
                  {getBudgetDescription(budget)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
