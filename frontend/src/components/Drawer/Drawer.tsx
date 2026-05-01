"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useDrawerTouch } from "./useDrawerTouch";
import {
  useDrawerPosition,
  useDrawerInitialHeight,
  useBodyScrollLock,
} from "./useDrawerHelpers";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  footer,
}: DrawerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [hasTouchSupport, setHasTouchSupport] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const position = useDrawerPosition(750);
  const { initialHeight, measuredRef } = useDrawerInitialHeight();
  useBodyScrollLock(isOpen && !isClosing);

  useEffect(() => {
    setHasTouchSupport(
      "ontouchstart" in window || navigator.maxTouchPoints > 0,
    );
  }, []);

  const setDrawerRef = useCallback(
    (el: HTMLDivElement | null) => {
      (drawerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      measuredRef(el);
    },
    [measuredRef],
  );

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
        // Focus close button when drawer opens
        setTimeout(() => closeButtonRef.current?.focus(), 50);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsAnimatingIn(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsVisible(false);
      onClose();
    }, 600);
  }, [onClose]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keyup", handleKeyUp);
    return () => document.removeEventListener("keyup", handleKeyUp);
  }, [handleClose]);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrawerTouch({
    initialHeight: initialHeight.current,
    onClose: handleClose,
  });

  if (!isVisible && !isOpen) return null;

  const isActive = isAnimatingIn && !isClosing;

  const drawerClasses =
    position === "to-right"
      ? `top-0 right-0 h-full w-full sm:w-[520px] ${isActive ? "translate-x-0" : "translate-x-full"}`
      : `bottom-0 left-0 right-0 w-full min-h-[300px] rounded-t-2xl ${isActive ? "translate-y-0" : "translate-y-full"}`;

  return (
    <div
      className={`fixed inset-0 z-[1000] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Detalhe da vaga"}
    >
      {/* Overlay */}
      <div
        className={`fixed inset-0 transition-[background-color] duration-300 ease-in-out ${
          isActive ? "bg-black/40" : "bg-black/0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={setDrawerRef}
        className={`fixed bg-white transition-transform duration-[600ms] ease-in-out z-[1001] flex flex-col ${drawerClasses}`}
      >
        {/* Header: drag handle (mobile) or close button (desktop) */}
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-slate-100">
          {position === "to-bottom" && hasTouchSupport ? (
            <>
              <div
                className="mx-auto w-10 h-1 bg-slate-200 rounded-full cursor-grab touch-none"
                onTouchStart={(e) => handleTouchStart(e, drawerRef.current)}
                onTouchMove={(e) => handleTouchMove(e, drawerRef.current)}
                onTouchEnd={() => handleTouchEnd(drawerRef.current)}
              />
              <button
                ref={closeButtonRef}
                className="absolute right-4 top-3 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
                onClick={handleClose}
                aria-label="Fechar"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-500 truncate pr-4">
                {title ?? "Detalhe da vaga"}
              </span>
              <button
                ref={closeButtonRef}
                className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
                onClick={handleClose}
                aria-label="Fechar"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
