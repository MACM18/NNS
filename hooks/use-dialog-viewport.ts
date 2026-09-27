"use client";

import { useCallback, useEffect, useRef, useState, type ForwardedRef } from "react";

/** Keep a portalled dialog inside the visible area when the keyboard opens. */
export function useDialogViewport<T extends HTMLElement>(forwardedRef: ForwardedRef<T>) {
  const elementRef = useRef<T | null>(null);
  const [element, setElement] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => {
    elementRef.current = node;
    setElement(node);
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  useEffect(() => {
    if (!element) return;
    const viewport = window.visualViewport;
    const update = () => {
      element.style.setProperty("--dialog-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty("--dialog-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty("--dialog-viewport-bottom", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [element]);

  const focusContainerOnMobile = (event: Event) => {
    if (!event.defaultPrevented && window.matchMedia?.("(max-width: 767px)").matches) {
      // Opening a form should not immediately cover it with the software keyboard.
      event.preventDefault();
      elementRef.current?.focus({ preventScroll: true });
    }
  };

  return { ref, focusContainerOnMobile };
}
