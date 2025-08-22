import { useStore } from "@tanstack/react-store";
import { chatStore, chatActions } from "../store/chatStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Zap } from "lucide-react";

type TemperatureOption = {
  value: number;
  label: string;
  description: string;
};

const TEMPERATURE_OPTIONS: TemperatureOption[] = [
  {
    value: 0.1,
    label: "Precise",
    description: "Most deterministic and focused",
  },
  {
    value: 0.3,
    label: "Focused",
    description: "Reliable with minimal variation",
  },
  {
    value: 0.5,
    label: "Balanced",
    description: "Good mix of consistency and variety",
  },
  {
    value: 0.7,
    label: "Creative",
    description: "More diverse and original",
  },
  {
    value: 0.9,
    label: "Surprising",
    description: "Highly creative and unexpected",
  },
];

export const TemperatureSelector = () => {
  const { settings } = useStore(chatStore);

  const handleTemperatureChange = (value: string) => {
    const numValue = parseFloat(value);
    chatActions.setTemperature(numValue);
  };

  // Find the closest temperature option to the current setting
  const getCurrentOption = () => {
    const currentTemp = settings.temperature;
    return TEMPERATURE_OPTIONS.reduce((closest, option) => {
      return Math.abs(option.value - currentTemp) <
        Math.abs(closest.value - currentTemp)
        ? option
        : closest;
    });
  };

  const currentOption = getCurrentOption();

  return (
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-primary" />
      <Select
        value={currentOption.value.toString()}
        onValueChange={handleTemperatureChange}
      >
        <SelectTrigger className="w-28 h-8 text-sm border-theme-border">
          <SelectValue>{currentOption.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-theme-background border-theme-border">
          {TEMPERATURE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              <div className="flex flex-col text-left">
                <span className="font-medium text-theme-foreground">
                  {option.label}
                </span>
                <span className="text-xs text-theme-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
