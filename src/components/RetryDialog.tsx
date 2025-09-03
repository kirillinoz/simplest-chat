import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { ModelSelector } from './ModelSelector';
import { ThinkingBudgetSelector } from './ThinkingBudgetSelector';
import { TemperatureSelector } from './TemperatureSelector';
import { chatStore, chatActions } from '../store/chatStore';
import { type GeminiModel, type ThinkingBudget } from '../types/chat';

interface RetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialModel: GeminiModel;
  initialThinkingBudget: ThinkingBudget;
  initialTemperature: number;
  onConfirm: (settings: {
    model: GeminiModel;
    thinkingBudget: ThinkingBudget;
    temperature: number;
  }) => void;
  isRetrying?: boolean;
}

export const RetryDialog = ({
  open,
  onOpenChange,
  initialModel,
  initialThinkingBudget,
  initialTemperature,
  onConfirm,
  isRetrying = false,
}: RetryDialogProps) => {
  // Store the original settings to restore them later
  const [originalSettings] = useState(() => {
    const { settings } = chatStore.state;
    return {
      model: settings.selectedModel,
      thinkingBudget: settings.thinkingBudgets[settings.selectedModel],
      temperature: settings.temperature,
    };
  });

  const handleConfirm = () => {
    // Get current values from the store (the selectors update the store directly)
    const { settings } = chatStore.state;

    const retrySettings = {
      model: settings.selectedModel,
      thinkingBudget: settings.thinkingBudgets[settings.selectedModel],
      temperature: settings.temperature,
    };

    // Restore original settings to the store
    chatActions.setModel(originalSettings.model);
    chatActions.setThinkingBudget(
      originalSettings.model,
      originalSettings.thinkingBudget
    );
    chatActions.setTemperature(originalSettings.temperature);

    // Call onConfirm with the retry settings
    onConfirm(retrySettings);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Restore original settings to the store
    chatActions.setModel(originalSettings.model);
    chatActions.setThinkingBudget(
      originalSettings.model,
      originalSettings.thinkingBudget
    );
    chatActions.setTemperature(originalSettings.temperature);
    onOpenChange(false);
  };

  // Set initial values when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Set the store to the initial values when opening
      chatActions.setModel(initialModel);
      chatActions.setThinkingBudget(initialModel, initialThinkingBudget);
      chatActions.setTemperature(initialTemperature);
    } else {
      // Restore original values when closing
      chatActions.setModel(originalSettings.model);
      chatActions.setThinkingBudget(
        originalSettings.model,
        originalSettings.thinkingBudget
      );
      chatActions.setTemperature(originalSettings.temperature);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-theme-background">
        <DialogHeader>
          <DialogTitle className="text-theme-foreground">
            Retry Message
          </DialogTitle>
          <p className="text-sm text-theme-muted-foreground">
            Adjust the settings below and retry the message with different
            parameters.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Model
            </label>
            <ModelSelector />
          </div>

          {/* Thinking Budget */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Thinking Budget
            </label>
            <ThinkingBudgetSelector />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Temperature
            </label>
            <TemperatureSelector />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isRetrying}
          >
            Cancel
          </Button>
          <Button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                Retrying...
              </>
            ) : (
              'Retry Message'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
