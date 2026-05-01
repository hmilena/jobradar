import { useState, useEffect, useCallback, useRef } from "react";

export function useDrawerPosition(breakpoint = 750) {
  // Safe SSR default: assume desktop (to-right). Corrected on first client render.
  const [position, setPosition] = useState<"to-right" | "to-bottom">("to-right");

  useEffect(() => {
    setPosition(window.innerWidth <= breakpoint ? "to-bottom" : "to-right");

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentBoxSize[0].inlineSize;
      setPosition(width <= breakpoint ? "to-bottom" : "to-right");
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [breakpoint]);

  return position;
}

export function useDrawerInitialHeight() {
  const initialHeight = useRef<number>(0);

  const measuredRef = useCallback((el: HTMLDivElement | null) => {
    if (el && initialHeight.current === 0) {
      initialHeight.current = el.offsetHeight;
    }
  }, []);

  return { initialHeight, measuredRef };
}

export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);
}
