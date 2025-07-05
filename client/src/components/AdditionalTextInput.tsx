import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ADDITIONAL_TEXT_LABELS, type AdditionalTextLabel } from '@/types/transcript';

interface AdditionalTextInputProps {
  value: string;
  onChange: (value: string) => void;
  label: AdditionalTextLabel;
  onLabelChange: (label: AdditionalTextLabel) => void;
  timestamp?: number;
  onTimestampChange?: (timestamp: number | undefined) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  maxLength?: number;
  disabled?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  showButtons?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
}

/**
 * AdditionalTextInput component for adding supplementary text to transcripts
 * Fully accessible with ARIA labels, keyboard navigation, and screen reader support
 */
export function AdditionalTextInput({
  value,
  onChange,
  label,
  onLabelChange,
  timestamp,
  onTimestampChange,
  placeholder = 'Add your notes, context, or corrections here...',
  className,
  id = 'additional-text-input',
  maxLength = 5000,
  disabled = false,
  onSave,
  onCancel,
  showButtons = true,
  isSaving = false,
  hasChanges = false,
}: AdditionalTextInputProps) {
  const textareaId = `${id}-textarea`;
  const labelSelectId = `${id}-label-select`;
  const timestampInputId = `${id}-timestamp`;

  const handleTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onTimestampChange) {
      onTimestampChange(value ? parseFloat(value) : undefined);
    }
  };

  const formatTimestamp = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestamp = (value: string): number | undefined => {
    if (!value) return undefined;
    const parts = value.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs)) {
        return mins * 60 + secs;
      }
    }
    return undefined;
  };

  return (
    <div 
      className={cn('space-y-4', className)}
      role="region"
      aria-label="Additional text input form"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <Label htmlFor={labelSelectId} className="text-sm font-medium">
            Label
            <span className="sr-only">Choose a category for your additional text</span>
          </Label>
          <Select
            value={label}
            onValueChange={(value) => onLabelChange(value as AdditionalTextLabel)}
            disabled={disabled}
          >
            <SelectTrigger 
              id={labelSelectId} 
              className="w-full mt-1"
              aria-describedby={`${labelSelectId}-description`}
            >
              <SelectValue placeholder="Select a label" />
            </SelectTrigger>
            <SelectContent>
              {ADDITIONAL_TEXT_LABELS.map((labelOption) => (
                <SelectItem key={labelOption} value={labelOption}>
                  {labelOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div id={`${labelSelectId}-description`} className="sr-only">
            Select the type of additional text you are adding to help categorize your note
          </div>
        </div>

        <div className="w-full sm:w-32">
          <Label htmlFor={timestampInputId} className="text-sm font-medium">
            Timestamp
            <span className="sr-only">Optional timestamp in minutes:seconds format</span>
          </Label>
          <input
            id={timestampInputId}
            type="text"
            value={formatTimestamp(timestamp)}
            onChange={(e) => {
              const parsed = parseTimestamp(e.target.value);
              if (onTimestampChange) {
                onTimestampChange(parsed);
              }
            }}
            placeholder="0:00"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || !onTimestampChange}
            aria-describedby={`${timestampInputId}-description`}
            pattern="[0-9]*:[0-5][0-9]"
            title="Enter timestamp in MM:SS format (e.g., 5:30)"
          />
          <div id={`${timestampInputId}-description`} className="sr-only">
            Enter a timestamp in minutes and seconds format where this additional text relates to in the video
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <Label htmlFor={textareaId} className="text-sm font-medium">
            Additional Text
            <span className="sr-only">Enter your additional notes or context</span>
          </Label>
          <span 
            className="text-xs text-muted-foreground"
            aria-label={`Character count: ${value.length} of ${maxLength} maximum`}
          >
            {value.length}/{maxLength}
          </span>
        </div>
        <Textarea
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="min-h-[120px] resize-y"
          aria-label="Additional text content"
          aria-describedby={`${textareaId}-description`}
          aria-invalid={value.length > maxLength}
          role="textbox"
          aria-multiline="true"
        />
        <div id={`${textareaId}-description`} className="sr-only">
          Enter additional text to enhance the transcript. You can add context, corrections, or clarifications.
        </div>
      </div>

      {showButtons && (onSave || onCancel) && (
        <div 
          className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2"
          role="group"
          aria-label="Form actions"
        >
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={disabled || isSaving}
              aria-describedby="cancel-help"
            >
              Cancel
            </Button>
          )}
          {onSave && (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onSave}
              disabled={disabled || isSaving || !hasChanges || value.length === 0}
              aria-describedby="save-help"
              aria-live="polite"
            >
              {isSaving ? (
                <>
                  <span className="sr-only">Saving in progress</span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          )}
          <div className="sr-only">
            <div id="cancel-help">
              Cancel button will discard all changes and reset the form
            </div>
            <div id="save-help">
              Save button will save your additional text. Disabled when no changes have been made or text is empty.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}