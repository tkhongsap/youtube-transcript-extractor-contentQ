import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdditionalTextState } from './useAdditionalTextState';
import type { CreateAdditionalTextInput } from '@/types/transcript';

describe('useAdditionalTextState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      expect(result.current.value).toBe('');
      expect(result.current.label).toBe('Additional Notes');
      expect(result.current.timestamp).toBeUndefined();
      expect(result.current.hasChanges).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it('initializes with provided values', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: 'Initial text',
          initialLabel: 'Context',
          initialTimestamp: 120,
        })
      );
      
      expect(result.current.value).toBe('Initial text');
      expect(result.current.label).toBe('Context');
      expect(result.current.timestamp).toBe(120);
      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe('State Updates', () => {
    it('updates value when setValue is called', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setValue('New value');
      });
      
      expect(result.current.value).toBe('New value');
      expect(result.current.hasChanges).toBe(true);
    });

    it('updates label when setLabel is called', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setLabel('Context');
      });
      
      expect(result.current.label).toBe('Context');
      expect(result.current.hasChanges).toBe(true);
    });

    it('updates timestamp when setTimestamp is called', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setTimestamp(180);
      });
      
      expect(result.current.timestamp).toBe(180);
      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('Change Detection', () => {
    it('detects changes from initial values', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: 'Initial',
          initialLabel: 'Additional Notes',
          initialTimestamp: undefined,
        })
      );
      
      expect(result.current.hasChanges).toBe(false);
      
      act(() => {
        result.current.setValue('Modified');
      });
      
      expect(result.current.hasChanges).toBe(true);
    });

    it('detects label changes', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setLabel('Context');
      });
      
      expect(result.current.hasChanges).toBe(true);
    });

    it('detects timestamp changes', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setTimestamp(60);
      });
      
      expect(result.current.hasChanges).toBe(true);
    });

    it('does not detect changes when reverting to initial state', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: 'Initial',
          initialLabel: 'Additional Notes',
        })
      );
      
      act(() => {
        result.current.setValue('Modified');
      });
      expect(result.current.hasChanges).toBe(true);
      
      act(() => {
        result.current.setValue('Initial');
      });
      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave with correct data', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      act(() => {
        result.current.setValue('Test content');
        result.current.setLabel('Context');
        result.current.setTimestamp(120);
      });
      
      await act(async () => {
        await result.current.handleSave();
      });
      
      const expectedData: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
        timestamp: 120,
      };
      
      expect(mockOnSave).toHaveBeenCalledWith(expectedData);
    });

    it('sets saving state during save operation', async () => {
      let resolvePromise: () => void;
      const mockOnSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );
      
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      act(() => {
        result.current.setValue('Test content');
      });
      
      // Start save operation without awaiting
      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.handleSave();
      });
      
      // Check that saving state is true
      expect(result.current.isSaving).toBe(true);
      
      // Resolve the promise
      act(() => {
        resolvePromise!();
      });
      
      await act(async () => {
        await savePromise!;
      });
      
      // Check that saving state is false
      expect(result.current.isSaving).toBe(false);
    });

    it('resets hasChanges after successful save', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      act(() => {
        result.current.setValue('Test content');
      });
      
      expect(result.current.hasChanges).toBe(true);
      
      await act(async () => {
        await result.current.handleSave();
      });
      
      expect(result.current.hasChanges).toBe(false);
    });

    it('does not save when no changes exist', async () => {
      const mockOnSave = vi.fn();
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      await act(async () => {
        await result.current.handleSave();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('does not save when value is empty', async () => {
      const mockOnSave = vi.fn();
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      act(() => {
        result.current.setLabel('Context'); // Change something but leave value empty
      });
      
      await act(async () => {
        await result.current.handleSave();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('handles save errors and rethrows them', async () => {
      const saveError = new Error('Save failed');
      const mockOnSave = vi.fn().mockRejectedValue(saveError);
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onSave: mockOnSave,
        })
      );
      
      act(() => {
        result.current.setValue('Test content');
      });
      
      await expect(
        act(async () => {
          await result.current.handleSave();
        })
      ).rejects.toThrow('Save failed');
      
      // Should reset saving state even on error
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Cancel Functionality', () => {
    it('resets to initial values when cancel is called', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: 'Initial',
          initialLabel: 'Context',
          initialTimestamp: 60,
        })
      );
      
      act(() => {
        result.current.setValue('Modified');
        result.current.setLabel('Additional Notes');
        result.current.setTimestamp(120);
      });
      
      expect(result.current.hasChanges).toBe(true);
      
      act(() => {
        result.current.handleCancel();
      });
      
      expect(result.current.value).toBe('Initial');
      expect(result.current.label).toBe('Context');
      expect(result.current.timestamp).toBe(60);
      expect(result.current.hasChanges).toBe(false);
    });

    it('calls onCancel callback when provided', () => {
      const mockOnCancel = vi.fn();
      const { result } = renderHook(() =>
        useAdditionalTextState({
          onCancel: mockOnCancel,
        })
      );
      
      act(() => {
        result.current.handleCancel();
      });
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    it('resets to empty state when reset is called', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: 'Initial',
          initialLabel: 'Context',
          initialTimestamp: 60,
        })
      );
      
      act(() => {
        result.current.setValue('Modified');
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.value).toBe('');
      expect(result.current.label).toBe('Additional Notes');
      expect(result.current.timestamp).toBeUndefined();
      // hasChanges should be true because empty state is different from initial state
      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined initial values gracefully', () => {
      const { result } = renderHook(() =>
        useAdditionalTextState({
          initialValue: undefined as any,
          initialLabel: undefined as any,
          initialTimestamp: undefined,
        })
      );
      
      expect(result.current.value).toBe('');
      expect(result.current.label).toBe('Additional Notes');
      expect(result.current.timestamp).toBeUndefined();
    });

    it('handles rapid state changes correctly', () => {
      const { result } = renderHook(() => useAdditionalTextState());
      
      act(() => {
        result.current.setValue('First');
        result.current.setValue('Second');
        result.current.setValue('Third');
      });
      
      expect(result.current.value).toBe('Third');
      expect(result.current.hasChanges).toBe(true);
    });
  });
});