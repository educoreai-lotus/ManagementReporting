/**
 * Component tests for Modal
 * Tests rendering and interaction
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../components/Common/Modal.jsx';

describe('Modal', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    const backdrop = container.querySelector('.absolute.inset-0');
    await user.click(backdrop);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal" footer={<button>Footer Button</button>}>
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('should not render footer when not provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    const footer = container.querySelector('.border-t');
    expect(footer).not.toBeInTheDocument();
  });
});

