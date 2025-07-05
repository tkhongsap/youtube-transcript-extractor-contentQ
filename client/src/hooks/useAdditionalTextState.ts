import { useState, useCallback, useEffect } from 'react';
import type { AdditionalTextLabel, CreateAdditionalTextInput } from '@/types/transcript';

interface UseAdditionalTextStateOptions {
  initialValue?: string;
  initialLabel?: AdditionalTextLabel;
  initialTimestamp?: number;
  onSave?: (data: CreateAdditionalTextInput) => void | Promise<void>;
  onCancel?: () => void;
}

interface UseAdditionalTextStateReturn {
  value: string;
  setValue: (value: string) => void;
  label: AdditionalTextLabel;
  setLabel: (label: AdditionalTextLabel) => void;
  timestamp: number | undefined;
  setTimestamp: (timestamp: number | undefined) => void;
  hasChanges: boolean;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  reset: () => void;
}

export function useAdditionalTextState({
  initialValue = '',
  initialLabel = 'Additional Notes',
  initialTimestamp,
  onSave,
  onCancel,
}: UseAdditionalTextStateOptions = {}): UseAdditionalTextStateReturn {
  const [value, setValue] = useState(initialValue);
  const [label, setLabel] = useState<AdditionalTextLabel>(initialLabel);
  const [timestamp, setTimestamp] = useState<number | undefined>(initialTimestamp);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = 
      value !== initialValue || 
      label !== initialLabel || 
      timestamp !== initialTimestamp;
    setHasChanges(changed);
  }, [value, label, timestamp, initialValue, initialLabel, initialTimestamp]);

  const handleSave = useCallback(async () => {
    if (!onSave || !hasChanges || value.length === 0) return;

    setIsSaving(true);
    try {
      const data: CreateAdditionalTextInput = {
        content: value,
        label,
        timestamp,
      };
      await onSave(data);
      // Reset hasChanges after successful save
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save additional text:', error);
      // Re-throw to allow parent component to handle
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [value, label, timestamp, onSave, hasChanges]);

  const handleCancel = useCallback(() => {
    // Reset to initial values
    setValue(initialValue);
    setLabel(initialLabel);
    setTimestamp(initialTimestamp);
    setHasChanges(false);
    
    if (onCancel) {
      onCancel();
    }
  }, [initialValue, initialLabel, initialTimestamp, onCancel]);

  const reset = useCallback(() => {
    setValue('');
    setLabel('Additional Notes');
    setTimestamp(undefined);
    // hasChanges will be set to false by the useEffect when values are reset
  }, []);

  return {
    value,
    setValue,
    label,
    setLabel,
    timestamp,
    setTimestamp,
    hasChanges,
    isSaving,
    handleSave,
    handleCancel,
    reset,
  };
}