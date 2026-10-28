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
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = Math.max(0, window.innerHeight - viewportHeight - viewportTop);

      element.style.setProperty("--dialog-viewport-height", `${viewportHeight}px`);
      element.style.setProperty("--dialog-viewport-top", `${viewportTop}px`);
      element.style.setProperty("--dialog-viewport-bottom", `${viewportBottom}px`);

      // This dialog has a desktop max-width utility. Apply its compact-screen
      // geometry directly so it cannot be left-aligned at half the viewport if
      // a stylesheet breakpoint is stale or the browser reports desktop width.
      if (element.classList.contains("add-line-dialog")) {
        if (window.matchMedia("(max-width: 1023px)").matches) {
          const mobileStyles: Record<string, string> = {
            position: "fixed",
            left: "0px",
            right: "0px",
            top: `${viewportTop}px`,
            bottom: `${viewportBottom}px`,
            width: "100vw",
            "max-width": "none",
            height: "auto",
            "max-height": "none",
            "min-width": "0px",
            margin: "0px",
            transform: "none",
            translate: "none",
            "border-radius": "0px",
          };

          for (const [property, value] of Object.entries(mobileStyles)) {
            element.style.setProperty(property, value, "important");
          }
        } else {
          for (const property of [
            "position",
            "left",
            "right",
            "top",
            "bottom",
            "width",
            "max-width",
            "height",
            "max-height",
            "min-width",
            "margin",
            "transform",
            "translate",
            "border-radius",
          ]) {
            element.style.removeProperty(property);
          }
        }
      }
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
