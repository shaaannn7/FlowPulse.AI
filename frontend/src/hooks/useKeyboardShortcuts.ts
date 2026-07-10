/**
 * File: useKeyboardShortcuts.ts
 * Purpose: Global hook capturing keyboard inputs.
 * Why it exists: Enforces accessibility guidelines, providing keyboard-only navigation for control center operators.
 */

import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrlKey, metaKey, altKey, action }) => {
        const matchesKey = event.key.toLowerCase() === key.toLowerCase();
        const matchesCtrl = ctrlKey === undefined || event.ctrlKey === ctrlKey;
        const matchesMeta = metaKey === undefined || event.metaKey === metaKey;
        const matchesAlt = altKey === undefined || event.altKey === altKey;

        if (matchesKey && matchesCtrl && matchesMeta && matchesAlt) {
          event.preventDefault();
          action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
