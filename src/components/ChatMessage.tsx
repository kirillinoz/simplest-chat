import { useState, useEffect } from 'react';
import type { Message, ThinkingBudget } from '../types/chat';
import {
  User,
  Bot,
  Image as ImageIcon,
  FileText,
  Copy,
  Check,
  Clock,
  Brain,
  Zap,
  Palette,
  Component,
  GitBranch,
  Trash2,
  Edit,
  Loader2,
} from 'lucide-react';
import { Card } from './ui/card';
import {
  GEMINI_MODELS,
  TEMPERATURE_OPTIONS,
  THINKING_BUDGETS,
  RESPONSE_STYLES,
} from '../types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import type { FileReference } from '../utils/fileStorage';
import { fileStorage } from '../utils/fileStorage';
import { useTheme } from '@/contexts/ThemeContext';
import { useStore } from '@tanstack/react-store';
import { chatStore } from '@/store/chatStore';
import type { ComponentProps } from 'react';
import React from 'react';

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
  const { settings } = useStore(chatStore);
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

  const formatUserTimestamp = (timestamp: Date) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInDays = Math.floor(
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      // Today - show time only
      return messageDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays < 7) {
      // Within a week - show day of week and time
      return messageDate.toLocaleDateString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      // Older than a week - show full date and time
      return messageDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year:
          messageDate.getFullYear() !== now.getFullYear()
            ? 'numeric'
            : undefined,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getModelDisplayName = (model?: string) => {
    if (!model) return null;
    return GEMINI_MODELS[model as keyof typeof GEMINI_MODELS]?.name || model;
  };

  const getResponseStyleFromSettings = (
    thinkingBudget?: ThinkingBudget,
    temperature?: number
  ) => {
    if (!thinkingBudget || typeof temperature !== 'number') return null;

    // Find matching response style
    const matchingStyle = Object.entries(RESPONSE_STYLES).find(
      ([_, style]) =>
        style.thinkingBudget === thinkingBudget &&
        Math.abs(style.temperature - temperature) < 0.05 // Allow small floating point differences
    );

    return matchingStyle ? matchingStyle[1].name : null;
  };

  const getThinkingBudgetDisplayName = (budget?: ThinkingBudget) => {
    if (!budget) return null;
    return THINKING_BUDGETS[budget]?.name || budget;
  };

  const getTemperatureDisplayName = (temp?: number) => {
    if (typeof temp !== 'number') return null;

    // Find exact match in temperature options
    const option = TEMPERATURE_OPTIONS.find(
      (opt) => Math.abs(opt.value - temp) < 0.05
    );
    return option?.label || temp.toString();
  };

  const formatResponseTime = (responseTimeMs?: number) => {
    if (typeof responseTimeMs !== 'number') return null;

    if (responseTimeMs < 1000) {
      return `${Math.round(responseTimeMs)}ms`;
    } else if (responseTimeMs < 60000) {
      return `${Math.round(responseTimeMs / 1000)}s`;
    } else {
      const minutes = Math.floor(responseTimeMs / 60000);
      const seconds = Math.round((responseTimeMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
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

  const handleRetryClick = () => {
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

  const isValidFileReference = (ref: unknown): ref is FileReference => {
    return (
      !!ref &&
      typeof ref === 'object' &&
      'id' in ref &&
      'name' in ref &&
      'type' in ref
    );
  };

  // Filter out invalid attachments
  const validAttachments =
    message.attachments?.filter(isValidFileReference) || [];

  return (
    <>
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
            {isStreaming && !message.content && (
              <div className="flex items-center gap-2 text-theme-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
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
                  <ol className="list-decimal pl-6 mb-4 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-theme-foreground my-3">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-theme-border pl-4 py-2 my-4 bg-theme-muted/50 italic">
                    {children}
                  </blockquote>
                ),
                code: (
                  props: ComponentProps<'code'> & {
                    inline?: boolean;
                  }
                ) => {
                  const { inline, children, className, ...rest } = props;
                  // This handler now renders BOTH inline code and the code for blocks.
                  // The decision to wrap in a <pre> or not is moved to the `pre` handler.
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
                      className={`${className || ''} text-theme-foreground font-mono text-sm`}
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                },
                pre: (props) => {
                  const { children, ...rest } = props;

                  // Ensure children is a valid React element
                  if (React.isValidElement(children) && children.props) {
                    // @ts-expect-error (ReactMarkdown types don't guarantee children.props exists)
                    const codeString = String(children.props.children).trim();

                    // If the code block is a single line, render it as an inline-style element
                    if (!codeString.includes('\n')) {
                      return (
                        <div className="my-4">
                          <code className="bg-theme-muted text-theme-foreground px-1.5 py-0.5 rounded text-sm font-mono">
                            {
                              // @ts-expect-error (ReactMarkdown types don't guarantee children.props exists)
                              children.props.children
                            }
                          </code>
                        </div>
                      );
                    }
                  }

                  // For multi-line code, render the standard pre-formatted block.
                  return (
                    <pre
                      className="bg-theme-background border border-theme-border rounded-lg p-4 overflow-x-auto mb-4"
                      {...rest}
                    >
                      {children}
                    </pre>
                  );
                },
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

            {/* Streaming cursor for when content is already partially loaded */}
            {isStreaming && message.content && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
            )}
          </div>

          {/* Timestamp and info display */}
          <div className="text-xs text-theme-muted-foreground flex items-center gap-2 min-h-[32px]">
            {message.role === 'user' ? (
              // User messages: show only timestamp and attachments
              <>
                <span>{formatUserTimestamp(message.timestamp)}</span>
                {validAttachments.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-xs text-theme-muted-foreground">
                      {validAttachments.length} attachment
                      {validAttachments.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </>
            ) : (
              // Assistant messages: show response time, model, and thinking/temperature info
              <>
                {/* Response time with clock icon */}
                {formatResponseTime(message.responseTimeMs) && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatResponseTime(message.responseTimeMs)}</span>
                  </div>
                )}

                {/* Model info */}
                {message.model && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-theme-muted text-theme-foreground flex items-center gap-1">
                      <Component size={12} />
                      {getModelDisplayName(message.model)}
                    </span>
                  </>
                )}

                {/* Settings display based on mode */}
                {(() => {
                  const responseStyle = getResponseStyleFromSettings(
                    message.thinkingBudget,
                    message.temperature
                  );

                  if (settings.settingsMode === 'simplest' && responseStyle) {
                    // Simplest mode with matching response style: show response style with palette icon
                    return (
                      <>
                        <span>•</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-chart-2/20 text-chart-2 flex items-center gap-1">
                          <Palette size={12} />
                          {responseStyle}
                        </span>
                      </>
                    );
                  } else {
                    // Simple mode OR simplest mode with no matching style: show detailed breakdown
                    return (
                      <>
                        {/* Thinking Budget with brain icon */}
                        {message.thinkingBudget && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-chart-3/20 text-chart-3 flex items-center gap-1">
                              <Brain size={12} />
                              {getThinkingBudgetDisplayName(
                                message.thinkingBudget
                              )}
                            </span>
                          </>
                        )}

                        {/* Temperature with lightning icon */}
                        {typeof message.temperature === 'number' && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-chart-1/20 text-chart-1 flex items-center gap-1">
                              <Zap size={12} />
                              {getTemperatureDisplayName(message.temperature)}
                            </span>
                          </>
                        )}
                      </>
                    );
                  }
                })()}

                {/* Attachments count */}
                {validAttachments.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-xs text-theme-muted-foreground">
                      {validAttachments.length} attachment
                      {validAttachments.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </>
            )}

            {/* --- NEW UNIFIED CONTROLS --- */}
            {showActions && !isStreaming && (
              <div className="flex items-center gap-4 text-theme-muted-foreground ml-2">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-theme-foreground transition-colors"
                  title="Copy message"
                >
                  {copySuccess ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>

                {/* Edit & Retry Button (USER ONLY) */}
                {message.role === 'user' && onRetry && (
                  <button
                    onClick={handleRetryClick}
                    className="flex items-center gap-1 hover:text-theme-foreground transition-colors disabled:opacity-50"
                    title="Edit & Retry"
                  >
                    <Edit size={16} />
                  </button>
                )}

                {/* Delete Button (for user messages) */}
                {message.role === 'user' && onDelete && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 hover:text-destructive transition-colors"
                    title="Delete message"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Branch Button (ASSISTANT ONLY) */}
                {message.role === 'assistant' && onBranch && (
                  <button
                    onClick={handleBranch}
                    className="flex items-center gap-1 hover:text-theme-foreground transition-colors"
                    title="Branch from this message"
                  >
                    <GitBranch size={16} />
                  </button>
                )}

                {/* Spacer to push delete button to the right */}
                <div className="flex-grow"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
