/**
 * Component tests for ErrorMessage
 * Tests rendering and interaction
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorMessage from '../../components/Common/ErrorMessage.jsx';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('should not render retry button when onRetry not provided', () => {
    render(<ErrorMessage message="Error" />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorMessage message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

