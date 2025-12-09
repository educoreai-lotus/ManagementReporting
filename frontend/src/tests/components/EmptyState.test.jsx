/**
 * Component tests for EmptyState
 * Tests rendering with different messages
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../../components/Common/EmptyState.jsx';

describe('EmptyState', () => {
  it('should render default message', () => {
    render(<EmptyState />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<EmptyState message="Custom empty message" />);
    
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should have correct structure', () => {
    const { container } = render(<EmptyState />);
    
    const card = container.querySelector('.card');
    expect(card).toBeInTheDocument();
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});


