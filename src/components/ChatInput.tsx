import { useState, useRef } from 'react';
import { Send, Paperclip, X, FileText, AlertCircle } from 'lucide-react';
import { chatActions, chatStore } from '../store/chatStore';
import { fileStorage } from '../utils/fileStorage';
import { Button } from './ui/button';
import { ModelSelector } from './ModelSelector';
import { ThinkingBudgetSelector } from './ThinkingBudgetSelector';
import { useStore } from '@tanstack/react-store';
import { TemperatureSelector } from './TemperatureSelector';
import { ResponseStyleSelector } from './ResponseStyleSelector';
import TextareaAutosize from 'react-textarea-autosize';

export const ChatInput = () => {
  const { settings } = useStore(chatStore);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isUploading) return;

    const messageToSend = message;
    const attachmentsToSend = attachments;

    setIsUploading(true);
    setMessage('');
    setAttachments([]);

    try {
      // Store files and get references
      const fileReferences = await Promise.all(
        attachments.map((file) => fileStorage.storeFile(file))
      );

      await chatActions.sendMessage(message, fileReferences);

      setUploadError('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadError('Failed to send message. Please try again.');

      setMessage(messageToSend);
      setAttachments(attachmentsToSend);

      setTimeout(() => setUploadError(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = (file: File): boolean => {
    return (
      file.type.startsWith('image/') &&
      [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/heic',
        'image/heif',
      ].includes(file.type)
    );
  };

  const isPDF = (file: File): boolean => {
    return file.type === 'application/pdf';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const supportedFiles = files.filter((file) => isPDF(file) || isImage(file));

    if (supportedFiles.length !== files.length) {
      setUploadError(
        'Only PDF and image files (PNG, JPEG, WebP, HEIC, HEIF) are supported'
      );
      setTimeout(() => setUploadError(''), 3000);
    }

    if (supportedFiles.length > 0) {
      // Check file sizes
      const oversizedFiles = supportedFiles.filter((file) => {
        // Images: 20MB limit for inline data
        if (isImage(file)) return file.size > 20 * 1024 * 1024;
        // PDFs: 50MB limit for File API
        if (isPDF(file)) return file.size > 50 * 1024 * 1024;
        return false;
      });

      if (oversizedFiles.length > 0) {
        setUploadError(
          'Images must be smaller than 20MB, PDFs smaller than 50MB'
        );
        setTimeout(() => setUploadError(''), 3000);
        return;
      }

      setAttachments((prev) => [...prev, ...supportedFiles]);
      setUploadError('');
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (isImage(file)) {
      return (
        <div className="w-8 h-8 rounded overflow-hidden border border-theme-border">
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-full h-full object-cover"
            onLoad={(_) => {
              //const img = e.target as HTMLImageElement;
              // Don't revoke immediately as we need it for display
            }}
          />
        </div>
      );
    }
    if (isPDF(file)) return <FileText className="h-8 w-8 text-primary" />;
    return <FileText className="h-8 w-8 text-theme-muted-foreground" />;
  };

  const getFileTypeLabel = (file: File) => {
    if (isImage(file)) return 'Image';
    if (isPDF(file)) return 'PDF';
    return 'File';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-theme-background">
      {/* Attachments Section - Above Toolbar */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 border-b border-theme-border bg-theme-muted/50">
          <div className="flex flex-wrap gap-3">
            {attachments.map((file, index) => {
              const fileSize = file.size / (1024 * 1024);
              const isLargeFile =
                (isPDF(file) && fileSize > 20) ||
                (isImage(file) && fileSize > 10);

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 border px-3 py-2 rounded-lg text-sm bg-theme-background ${
                    isImage(file)
                      ? 'border-chart-2/50' // Green for images
                      : isLargeFile
                        ? 'border-chart-3/50' // Orange for large files
                        : 'border-chart-1/50' // Blue for PDFs
                  }`}
                >
                  {/* File icon or image thumbnail */}
                  <div className="flex-shrink-0">{getFileIcon(file)}</div>

                  {/* File info */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate max-w-[150px] text-theme-foreground">
                      {file.name}
                    </span>
                    <span
                      className={`text-xs ${
                        isImage(file)
                          ? 'text-chart-2' // Green for images
                          : isLargeFile
                            ? 'text-chart-3' // Orange for large files
                            : 'text-theme-muted-foreground'
                      }`}
                    >
                      {getFileTypeLabel(file)} • {formatFileSize(file.size)}
                      {isLargeFile && ' (File API)'}
                    </span>
                  </div>

                  {/* Remove button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAttachment(index)}
                    className="h-6 w-6 p-0 flex-shrink-0 hover:bg-destructive/10 text-theme-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        {uploadError && (
          <div className="mb-3 flex items-center gap-2 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {uploadError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <TextareaAutosize
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full resize-none rounded-md border border-theme-border bg-theme-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              minRows={2}
              maxRows={15}
              disabled={isUploading}
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={
              (!message.trim() && attachments.length === 0) || isUploading
            }
            className="h-10 w-10 p-0 btn-primary"
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Toolbar - Model and Setting Controls */}
      <div className="px-4 py-3 border-b border-theme-border bg-theme-muted/50">
        <div className="flex gap-4">
          {/* Model Selector */}
          <div>
            <ModelSelector />
          </div>

          {/* Settings based on mode */}
          {settings.settingsMode === 'simple' ? (
            <>
              {/* Thinking Budget */}
              <div>
                <ThinkingBudgetSelector />
              </div>

              {/* Temperature Slider */}
              <div>
                <TemperatureSelector />
              </div>
            </>
          ) : (
            <>
              {/* Response Style Selector */}
              <div>
                <ResponseStyleSelector />
              </div>
            </>
          )}

          {/* Attach Button */}
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-3 text-sm hover:bg-theme-muted border-theme-border w-full"
              title="Images (PNG, JPEG, WebP, HEIC, HEIF) up to 20MB • PDFs up to 50MB"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
