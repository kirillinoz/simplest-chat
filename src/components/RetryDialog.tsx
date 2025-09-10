import { useState, useEffect, useRef } from 'react';
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
import type { GeminiModel, ThinkingBudget } from '../types/chat';
import TextareaAutosize from 'react-textarea-autosize';
import { fileStorage, type FileReference } from '@/utils/fileStorage';
import { AlertCircle, FileText, ImageIcon, PlusCircle, X } from 'lucide-react';

interface RetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialModel: GeminiModel;
  initialThinkingBudget: ThinkingBudget;
  initialTemperature: number;
  initialContent: string;
  initialAttachments: FileReference[];
  subsequentMessageCount: number;
  onConfirm: (settings: {
    model: GeminiModel;
    thinkingBudget: ThinkingBudget;
    temperature: number;
    content: string;
    attachments: FileReference[];
  }) => void;
  isRetrying?: boolean;
}

export const RetryDialog = ({
  open,
  onOpenChange,
  initialModel,
  initialThinkingBudget,
  initialTemperature,
  initialContent,
  initialAttachments,
  subsequentMessageCount = 0,
  onConfirm,
  isRetrying = false,
}: RetryDialogProps) => {
  const [editedContent, setEditedContent] = useState(initialContent);
  const [editedAttachments, setEditedAttachments] = useState<FileReference[]>(
    initialAttachments || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Store the original settings to restore them later
  const [originalSettings] = useState(() => {
    const { settings } = chatStore.state;
    return {
      model: settings.selectedModel,
      thinkingBudget: settings.thinkingBudgets[settings.selectedModel],
      temperature: settings.temperature,
    };
  });

  useEffect(() => {
    // Reset content when the dialog is re-opened with a new message
    setEditedContent(initialContent);
    setEditedAttachments(initialAttachments || []);
  }, [initialContent, initialAttachments]);

  useEffect(() => {
    if (open) {
      // Use a timeout to ensure the element is rendered and focusable
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Move the cursor to the end of the text
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 100); // A small delay is often needed for modals
    }
  }, [open]);

  const handleConfirm = () => {
    const { settings } = chatStore.state;
    const retrySettings = {
      model: settings.selectedModel,
      thinkingBudget: settings.thinkingBudgets[settings.selectedModel],
      temperature: settings.temperature,
      content: editedContent,
      attachments: editedAttachments,
    };

    // Restore original global settings
    chatActions.setModel(originalSettings.model);
    chatActions.setThinkingBudget(
      originalSettings.model,
      originalSettings.thinkingBudget
    );
    chatActions.setTemperature(originalSettings.temperature);

    onConfirm(retrySettings);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Restore original global settings on cancel
    chatActions.setModel(originalSettings.model);
    chatActions.setThinkingBudget(
      originalSettings.model,
      originalSettings.thinkingBudget
    );
    chatActions.setTemperature(originalSettings.temperature);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Set the store to the initial values for the selectors
      chatActions.setModel(initialModel);
      chatActions.setThinkingBudget(initialModel, initialThinkingBudget);
      chatActions.setTemperature(initialTemperature);
    } else {
      handleCancel(); // Ensure settings are restored if closed via overlay click
    }
    onOpenChange(open);
  };

  const handleAddFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newFileReferences = await Promise.all(
      files.map(async (file) => await fileStorage.storeFile(file))
    );

    setEditedAttachments((prev) => [...prev, ...newFileReferences]);
    // Clear the file input so the same file can be added again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setEditedAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId)
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-theme-background">
        <DialogHeader>
          <DialogTitle className="text-theme-foreground">
            Edit & Retry
          </DialogTitle>
        </DialogHeader>

        {/* --- NEW WARNING BANNER --- */}
        {subsequentMessageCount > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-semibold">
                This will clear proceeding messages
              </p>
              <p>
                Editing this message will permanently delete the{' '}
                <strong>
                  {subsequentMessageCount} message
                  {subsequentMessageCount > 1 ? 's' : ''}
                </strong>{' '}
                that follow it.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Prompt
            </label>
            <TextareaAutosize
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[100px] max-h-64 resize-none bg-theme-background border border-theme-border rounded-md p-2 text-sm focus:outline-none"
              minRows={4}
              maxRows={8}
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Attachments
            </label>
            <div className="flex flex-wrap gap-2">
              {editedAttachments.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-theme-muted/50 border border-theme-border rounded-md px-2 py-1 flex items-center gap-2 text-sm"
                >
                  {ref.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-chart-2" />
                  ) : (
                    <FileText className="h-4 w-4 text-chart-1" />
                  )}
                  <span className="text-theme-foreground">{ref.name}</span>
                  <button
                    onClick={() => handleRemoveAttachment(ref.id)}
                    className="text-theme-muted-foreground hover:text-destructive"
                    disabled={isRetrying}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-auto py-1 px-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRetrying}
              >
                <PlusCircle size={14} className="mr-2" />
                Add File
              </Button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleAddFiles}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Model
            </label>
            <ModelSelector />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-theme-foreground">
              Thinking Budget
            </label>
            <ThinkingBudgetSelector />
          </div>

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
                Generating...
              </>
            ) : (
              'Save & Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
