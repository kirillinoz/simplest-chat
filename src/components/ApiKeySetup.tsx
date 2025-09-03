import { useState } from 'react';
import { Key } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
}

export const ApiKeySetup = ({ onApiKeySet }: ApiKeySetupProps) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }
    onApiKeySet(apiKey.trim());
  };

  return (
    <div className="min-h-screen bg-theme-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-theme-muted rounded-full flex items-center justify-center">
            <Key className="h-6 w-6 text-chart-1" />
          </div>
          <CardTitle className="text-2xl text-theme-foreground">
            Welcome to Simplest Chat
          </CardTitle>
          <CardDescription className="text-theme-muted-foreground">
            Enter your Gemini API key to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="apiKey"
                className="text-sm font-medium text-theme-foreground"
              >
                Gemini API Key
              </label>
              <Input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className={error ? 'border-red-500' : 'border-theme-border'}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <Button type="submit" className="w-full btn-primary">
              Save & Continue
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-theme-muted-foreground">
            <p>
              Get your API key from{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-chart-1 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
