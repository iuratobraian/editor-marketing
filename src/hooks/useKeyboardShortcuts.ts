import { useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';

export const useKeyboardShortcuts = () => {
  const {
    selectedIds,
    undo,
    redo,
    copySelected,
    paste,
    duplicateSelected,
    deleteSelected,
    updateElements,
    saveHistory,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo & Redo
      if (modifierPressed && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      
      if (modifierPressed && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      // 2. Copy & Paste & Duplicate
      if (modifierPressed && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      }

      if (modifierPressed && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        paste();
      }

      if (modifierPressed && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      }

      // 3. Delete Selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }

      // 4. Element Position Nudges (Arrow Keys)
      if (
        e.key === 'ArrowUp' || 
        e.key === 'ArrowDown' || 
        e.key === 'ArrowLeft' || 
        e.key === 'ArrowRight'
      ) {
        if (selectedIds.length === 0) return;
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
          case 'ArrowLeft':
            dx = -step;
            break;
          case 'ArrowRight':
            dx = step;
            break;
          case 'ArrowUp':
            dy = -step;
            break;
          case 'ArrowDown':
            dy = step;
            break;
        }

        // Save state snapshot for undo before nudging
        saveHistory();

        // Update coordinates
        updateElements(selectedIds, (el) => ({
          x: el.x + dx,
          y: el.y + dy,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedIds,
    undo,
    redo,
    copySelected,
    paste,
    duplicateSelected,
    deleteSelected,
    updateElements,
    saveHistory,
  ]);
};
