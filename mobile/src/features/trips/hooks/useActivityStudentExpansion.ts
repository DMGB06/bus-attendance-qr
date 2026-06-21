import { useCallback, useState } from "react";

export function useActivityStudentExpansion() {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const isExpanded = useCallback((key: string) => expandedKeys.has(key), [expandedKeys]);

  const toggle = useCallback((key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedKeys(new Set());
  }, []);

  return { isExpanded, toggle, collapseAll };
}
