/**
 * Component tests for LoadingSpinner
 * Tests basic rendering
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/Common/LoadingSpinner.jsx';

describe('LoadingSpinner', () => {
  it('should render spinner element', () => {
    render(<LoadingSpinner />);
    
    const spinners = screen.getAllByRole('generic');
    const spinner = spinners.find(el => el.querySelector('.animate-spin'));
    expect(spinner).toBeInTheDocument();
  });

  it('should have correct structure', () => {
    const { container } = render(<LoadingSpinner />);
    
    const flexContainer = container.querySelector('.flex.items-center.justify-center');
    expect(flexContainer).toBeInTheDocument();
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});

