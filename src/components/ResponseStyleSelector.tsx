import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RESPONSE_STYLES } from "../types/chat";
import type { ResponseStyle } from "../types/chat";
import { Palette } from "lucide-react";

export const ResponseStyleSelector = () => {
  const { settings } = useStore(chatStore);

  const handleResponseStyleChange = (value: ResponseStyle) => {
    chatActions.setResponseStyle(value);
  };

  const getCurrentStyleName = () => {
    return RESPONSE_STYLES[settings.responseStyle].name;
  };

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-primary" />
      <Select
        value={settings.responseStyle}
        onValueChange={handleResponseStyleChange}
      >
        <SelectTrigger className="w-44 h-8 text-sm border-theme-border">
          <SelectValue>{getCurrentStyleName()}</SelectValue>
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
        </SelectContent>
      </Select>
    </div>
  );
};
