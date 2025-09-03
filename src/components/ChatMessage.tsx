import { useState, useEffect } from 'react';
import type { Message } from '../types/chat';
import {
  User,
  Bot,
  Image as ImageIcon,
  FileText,
  Copy,
  GitBranch,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Card } from './ui/card';
import { GEMINI_MODELS } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { FileReference } from '../utils/fileStorage';
import { fileStorage } from '../utils/fileStorage';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './ui/button';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (message: Message) => void;
  onBranch?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export const ChatMessage = ({
  message,
  isStreaming = false,
  onCopy,
  onBranch,
  onRetry,
  onDelete,
}: ChatMessageProps) => {
  const { theme } = useTheme();
  const [loadedFiles, setLoadedFiles] = useState<Map<string, File>>(new Map());
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [showActions, setShowActions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Dynamically load highlight.js theme based on current theme
  useEffect(() => {
    const loadHighlightTheme = async () => {
      // Remove existing highlight.js stylesheets
      const existingLinks = document.querySelectorAll(
        'link[href*="highlight.js"]'
      );
      existingLinks.forEach((link) => link.remove());

      // Create new link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        theme === 'light'
          ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
          : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';

      document.head.appendChild(link);
    };

    loadHighlightTheme();
  }, [theme]);

  const getModelDisplayName = (model?: string) => {
    if (!model) return null;
    return GEMINI_MODELS[model as keyof typeof GEMINI_MODELS]?.name || model;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onCopy?.(message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleBranch = () => {
    onBranch?.(message);
  };

  const handleRetry = () => {
    onRetry?.(message);
  };

  const handleDelete = () => {
    onDelete?.(message);
  };

  useEffect(() => {
    const loadFiles = async () => {
      if (!message.attachments?.length) return;

      const filesToLoad = message.attachments.filter(
        (ref) =>
          ref?.id && !loadedFiles.has(ref.id) && !loadingFiles.has(ref.id)
      );

      if (filesToLoad.length === 0) return;

      // Mark files as loading
      setLoadingFiles(
        (prev) => new Set([...prev, ...filesToLoad.map((f) => f.id)])
      );

      try {
        const results = await Promise.allSettled(
          filesToLoad.map(async (ref) => {
            const file = await fileStorage.getFile(ref.id);
            return { ref, file };
          })
        );

        const newFiles = new Map(loadedFiles);
        const stillLoading = new Set(loadingFiles);

        results.forEach((result, index) => {
          const ref = filesToLoad[index];
          stillLoading.delete(ref.id);

          if (result.status === 'fulfilled' && result.value.file) {
            newFiles.set(ref.id, result.value.file);
          }
        });

        setLoadedFiles(newFiles);
        setLoadingFiles(stillLoading);
      } catch (error) {
        console.error('Failed to load files:', error);
        setLoadingFiles((prev) => {
          const newSet = new Set(prev);
          filesToLoad.forEach((f) => newSet.delete(f.id));
          return newSet;
        });
      }
    };

    loadFiles();
  }, [message.attachments, loadedFiles, loadingFiles]);

  const getFileFromReference = (ref: FileReference): File | null => {
    return loadedFiles.get(ref.id) || null;
  };

  const isImage = (ref: FileReference): boolean => {
    if (!ref || !ref.type || typeof ref.type !== 'string') {
      return false;
    }
    return ref.type.startsWith('image/');
  };

  const canShowImagePreview = (ref: FileReference): boolean => {
    const file = getFileFromReference(ref);
    return isImage(ref) && file !== null;
  };

  const isValidFileReference = (ref: any): ref is FileReference => {
    return ref && typeof ref === 'object' && ref.id && ref.name && ref.type;
  };

  // Filter out invalid attachments
  const validAttachments =
    message.attachments?.filter(isValidFileReference) || [];

  return (
    <div
      className={`group flex gap-4 p-6 hover:bg-theme-muted/20 transition-colors ${
        message.role === 'user' ? 'user-message-bg' : 'assistant-message-bg'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-theme-muted text-theme-foreground'
        }`}
      >
        {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="flex-1 space-y-3">
        {/* Attachments */}
        {message.role === 'user' && validAttachments.length > 0 && (
          <div className="space-y-2">
            {/* Image previews */}
            {validAttachments.filter(canShowImagePreview).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validAttachments.filter(canShowImagePreview).map((ref) => {
                  const file = getFileFromReference(ref);
                  if (!file) return null;

                  try {
                    return (
                      <div key={`image-${ref.id}`} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={ref.name}
                          className="max-w-xs max-h-48 object-contain rounded-lg border border-theme-border shadow-sm"
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            URL.revokeObjectURL(img.src);
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            URL.revokeObjectURL(img.src);
                          }}
                        />
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded">
                          <ImageIcon className="w-3 h-3 inline mr-1" />
                          {ref.name.length > 20
                            ? ref.name.substring(0, 20) + '...'
                            : ref.name}
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.warn(
                      'Could not create object URL for image:',
                      error
                    );
                    return null;
                  }
                })}
              </div>
            )}

            {/* File attachments */}
            <div className="flex flex-wrap gap-2">
              {validAttachments.map((ref) => {
                if (canShowImagePreview(ref)) return null;

                const isLoading = loadingFiles.has(ref.id);

                return (
                  <Card
                    key={`file-${ref.id}`}
                    className={`px-3 py-2 bg-theme-background border-theme-border`}
                  >
                    <div className="flex items-center gap-2">
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-theme-muted-foreground border-t-theme-foreground"></div>
                      ) : isImage(ref) ? (
                        <ImageIcon className="h-4 w-4 text-chart-2" />
                      ) : (
                        <FileText className="h-4 w-4 text-chart-1" />
                      )}
                      <span className="text-sm text-theme-foreground">
                        {ref.name}
                      </span>
                      {isImage(ref) &&
                        !canShowImagePreview(ref) &&
                        !isLoading && (
                          <span className="text-xs text-theme-muted-foreground">
                            (Preview unavailable)
                          </span>
                        )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-theme-foreground mt-6 mb-4 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-theme-foreground mt-5 mb-3 first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-theme-foreground mt-4 mb-2 first:mt-0">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-theme-foreground leading-relaxed mb-4 last:mb-0">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-theme-foreground my-3">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-theme-border pl-4 py-2 my-4 bg-theme-muted/50 italic">
                  {children}
                </blockquote>
              ),
              code: (props: any) => {
                const { inline, children, className, ...rest } = props;
                if (inline) {
                  return (
                    <code
                      className="bg-theme-muted text-theme-foreground px-1.5 py-0.5 rounded text-sm font-mono"
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className={`${className || ''} block bg-theme-background text-theme-foreground p-4 rounded-lg overflow-x-auto text-sm font-mono my-3`}
                    {...rest}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-theme-background border border-theme-border rounded-lg overflow-hidden mb-4">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-theme-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-theme-muted">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border border-theme-border px-4 py-2 text-left font-semibold text-theme-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-theme-border px-4 py-2 text-theme-foreground">
                  {children}
                </td>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-chart-1 hover:text-chart-1/80 underline"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-theme-foreground">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic text-theme-foreground">{children}</em>
              ),
              hr: () => <hr className="my-3 border-theme-border" />,
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
          )}
        </div>

        {/* Timestamp, model info, action buttons */}
        <div className="text-xs text-theme-muted-foreground flex items-center gap-2 min-h-[32px]">
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.model && (
            <>
              <span>•</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  message.role === 'assistant'
                    ? 'bg-theme-muted text-theme-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {getModelDisplayName(message.model)}
                {isStreaming && <span className="ml-1 animate-pulse">●</span>}
              </span>
            </>
          )}
          {validAttachments.length > 0 && (
            <>
              <span>•</span>
              <span className="text-xs text-theme-muted-foreground">
                {validAttachments.length} attachment
                {validAttachments.length > 1 ? 's' : ''}
              </span>
            </>
          )}
          {/* Action buttons */}
          {showActions && !isStreaming && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy button - available for all messages */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2 text-theme-muted-foreground hover:text-theme-foreground"
                title="Copy message"
              >
                <Copy size={14} />
                {copySuccess && <span className="ml-1 text-xs">Copied!</span>}
              </Button>

              {/* Branch button - only for assistant messages */}
              {message.role === 'assistant' && onBranch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBranch}
                  className="h-8 px-2 text-theme-muted-foreground hover:text-theme-foreground"
                  title="Branch conversation"
                >
                  <GitBranch size={14} />
                </Button>
              )}

              {/* Retry button - only for assistant messages */}
              {message.role === 'assistant' && onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="h-8 px-2 text-theme-muted-foreground hover:text-theme-foreground"
                  title="Retry message"
                >
                  <RotateCcw size={14} />
                </Button>
              )}

              {/* Delete button - only for user messages */}
              {message.role === 'user' && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 px-2 text-theme-muted-foreground hover:text-destructive"
                  title="Delete message"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
