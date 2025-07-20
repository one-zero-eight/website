import { useEffect } from 'react';

export const useModalKeyboard = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add event handler
    document.addEventListener('keydown', handleKeyDown);

    // Clean up handler on unmount or modal close
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}; 