import { useStore } from '@tanstack/react-store';
import { chatStore, chatActions } from '../store/chatStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RESPONSE_STYLES } from '../types/chat';
import type { ResponseStyle } from '../types/chat';
import { Palette } from 'lucide-react';

export const ResponseStyleSelector = () => {
  const { settings } = useStore(chatStore);

  const handleResponseStyleChange = (value: ResponseStyle) => {
    const style = RESPONSE_STYLES[value];

    // Update both thinking budget and temperature based on the selected style
    chatActions.setThinkingBudget(settings.selectedModel, style.thinkingBudget);
    chatActions.setTemperature(style.temperature);
    chatActions.setResponseStyle(value);
  };

  const getCurrentResponseStyle = (): ResponseStyle | null => {
    const currentThinking = settings.thinkingBudgets[settings.selectedModel];
    const currentTemp = settings.temperature;

    // Find matching response style
    const matchingStyle = Object.entries(RESPONSE_STYLES).find(
      ([_, style]) =>
        style.thinkingBudget === currentThinking &&
        Math.abs(style.temperature - currentTemp) < 0.05 // Allow small floating point differences
    );

    return matchingStyle ? (matchingStyle[0] as ResponseStyle) : null;
  };

  const currentStyle = getCurrentResponseStyle();
  const displayValue = currentStyle
    ? RESPONSE_STYLES[currentStyle].name
    : 'Custom';

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-primary" />
      <Select
        value={currentStyle || 'custom'}
        onValueChange={(value) => {
          if (value !== 'custom') {
            handleResponseStyleChange(value as ResponseStyle);
          }
        }}
      >
        <SelectTrigger className="w-44 h-8 text-sm border-theme-border">
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-theme-background border-theme-border">
          {Object.entries(RESPONSE_STYLES).map(([key, style]) => (
            <SelectItem key={key} value={key}>
              <div className="flex flex-col text-left">
                <span className="font-medium text-theme-foreground">
                  {style.name}
                </span>
                <span className="text-xs text-theme-muted-foreground">
                  {style.description}
                </span>
              </div>
            </SelectItem>
          ))}
          {!currentStyle && (
            <SelectItem value="custom" disabled>
              <div className="flex flex-col text-left">
                <span className="font-medium text-theme-foreground">
                  Custom
                </span>
                <span className="text-xs text-theme-muted-foreground">
                  Manual thinking budget & temperature
                </span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
