import { useRef, useCallback } from "react";

interface UseTouchSwipeOptions {
  initialHeight: number;
  onClose: () => void;
}

export function useDrawerTouch({ initialHeight, onClose }: UseTouchSwipeOptions) {
  const touchState = useRef({ startY: 0, startHeight: 0 });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>, drawerEl: HTMLDivElement | null) => {
      if (!drawerEl) return;
      touchState.current.startHeight = drawerEl.offsetHeight;
      touchState.current.startY = e.touches[0].clientY;
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>, drawerEl: HTMLDivElement | null) => {
      if (!drawerEl) return;
      const deltaY = e.touches[0].clientY - (touchState.current.startY + 20);
      drawerEl.style.height = `${touchState.current.startHeight - deltaY}px`;
    },
    []
  );

  const handleTouchEnd = useCallback(
    (drawerEl: HTMLDivElement | null) => {
      if (!drawerEl) return;
      const twoThirdsHeight = (touchState.current.startHeight * 2) / 3;
      const currentHeight = drawerEl.getBoundingClientRect().height;

      if (currentHeight >= twoThirdsHeight) {
        drawerEl.style.height = `${initialHeight}px`;
        drawerEl.style.transform = "translateY(0%)";
      } else {
        onClose();
      }
    },
    [initialHeight, onClose]
  );

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
