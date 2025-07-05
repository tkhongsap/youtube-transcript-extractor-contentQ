import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdditionalTextInput } from './AdditionalTextInput';
import type { AdditionalTextLabel } from '@/types/transcript';

describe('AdditionalTextInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    label: 'Additional Notes' as AdditionalTextLabel,
    onLabelChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all form elements', () => {
      render(<AdditionalTextInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timestamp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/additional text content/i)).toBeInTheDocument();
    });

    it('shows character count display', () => {
      render(<AdditionalTextInput {...defaultProps} value="Test content" />);
      
      expect(screen.getByText('12/5000')).toBeInTheDocument();
    });

    it('renders with custom maxLength', () => {
      render(<AdditionalTextInput {...defaultProps} value="Test" maxLength={100} />);
      
      expect(screen.getByText('4/100')).toBeInTheDocument();
    });
  });

  describe('Text Input Functionality', () => {
    it('calls onChange when text is entered', async () => {
      const user = userEvent.setup();
      render(<AdditionalTextInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText(/additional text content/i);
      await user.type(textarea, 'Hello world');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('Hello world');
    });

    it('respects maxLength constraint', () => {
      render(<AdditionalTextInput {...defaultProps} maxLength={10} />);
      
      const textarea = screen.getByLabelText(/additional text content/i);
      expect(textarea).toHaveAttribute('maxLength', '10');
    });
  });

  describe('Label Selection', () => {
    it('displays current label in select trigger', () => {
      render(<AdditionalTextInput {...defaultProps} label="Context" />);
      
      expect(screen.getByRole('combobox')).toHaveTextContent('Context');
    });

    it('calls onLabelChange when label is changed', async () => {
      const user = userEvent.setup();
      render(<AdditionalTextInput {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      const contextOption = screen.getByRole('option', { name: 'Context' });
      await user.click(contextOption);
      
      expect(defaultProps.onLabelChange).toHaveBeenCalledWith('Context');
    });
  });

  describe('Timestamp Input', () => {
    it('formats timestamp display correctly', () => {
      render(<AdditionalTextInput {...defaultProps} timestamp={125} />);
      
      const timestampInput = screen.getByLabelText(/timestamp/i);
      expect(timestampInput).toHaveValue('2:05');
    });

    it('calls onTimestampChange when timestamp is modified', async () => {
      const user = userEvent.setup();
      const onTimestampChange = vi.fn();
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onTimestampChange={onTimestampChange} 
        />
      );
      
      const timestampInput = screen.getByLabelText(/timestamp/i);
      await user.clear(timestampInput);
      await user.type(timestampInput, '3:45');
      
      expect(onTimestampChange).toHaveBeenCalledWith(225);
    });

    it('handles invalid timestamp input gracefully', async () => {
      const user = userEvent.setup();
      const onTimestampChange = vi.fn();
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onTimestampChange={onTimestampChange} 
        />
      );
      
      const timestampInput = screen.getByLabelText(/timestamp/i);
      await user.type(timestampInput, 'invalid');
      
      expect(onTimestampChange).toHaveBeenCalledWith(undefined);
    });

    it('is disabled when onTimestampChange is not provided', () => {
      render(<AdditionalTextInput {...defaultProps} />);
      
      const timestampInput = screen.getByLabelText(/timestamp/i);
      expect(timestampInput).toBeDisabled();
    });
  });

  describe('Save/Cancel Buttons', () => {
    it('shows buttons when onSave or onCancel are provided', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );
      
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('hides buttons when showButtons is false', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={vi.fn()} 
          onCancel={vi.fn()}
          showButtons={false}
        />
      );
      
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('disables save button when no changes or empty content', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={vi.fn()}
          hasChanges={false}
          value=""
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when there are changes and content', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={vi.fn()}
          hasChanges={true}
          value="Some content"
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('shows saving state', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={vi.fn()}
          isSaving={true}
        />
      );
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onSave={onSave}
          hasChanges={true}
          value="Some content"
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          onCancel={onCancel}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all inputs when disabled prop is true', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          disabled={true}
          onTimestampChange={vi.fn()}
        />
      );
      
      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByLabelText(/timestamp/i)).toBeDisabled();
      expect(screen.getByLabelText(/additional text content/i)).toBeDisabled();
    });

    it('disables buttons when disabled', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          disabled={true}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AdditionalTextInput {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: /additional text input form/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /form actions/i })).toBeInTheDocument();
    });

    it('associates labels with form controls', () => {
      render(<AdditionalTextInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText(/additional text content/i);
      expect(textarea).toHaveAttribute('aria-describedby');
    });

    it('provides screen reader instructions', () => {
      render(<AdditionalTextInput {...defaultProps} />);
      
      expect(screen.getByText(/choose a category for your additional text/i)).toBeInTheDocument();
      expect(screen.getByText(/enter your additional notes or context/i)).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <AdditionalTextInput {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('uses custom placeholder', () => {
      render(
        <AdditionalTextInput 
          {...defaultProps} 
          placeholder="Custom placeholder text" 
        />
      );
      
      expect(screen.getByPlaceholderText('Custom placeholder text')).toBeInTheDocument();
    });

    it('uses custom id prefix', () => {
      render(<AdditionalTextInput {...defaultProps} id="custom-id" />);
      
      expect(screen.getByLabelText(/additional text content/i)).toHaveAttribute('id', 'custom-id-textarea');
    });
  });
});