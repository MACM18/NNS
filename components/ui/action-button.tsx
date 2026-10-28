"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionButtonStyle = "compact" | "text" | "filled";

export function ActionButton({
  icon,
  label,
  ariaLabel,
  style = "filled",
  className,
  title,
  ...props
}: {
  icon?: ReactNode;
  label: string;
  ariaLabel?: string;
  style?: ActionButtonStyle;
  className?: string;
  title?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (style === "compact") {
    return <Button {...props} type={props.type || "button"} size="icon" variant="ghost" aria-label={ariaLabel || label} title={title || label} className={cn("h-8 w-8", className)}>{icon}</Button>;
  }
  if (style === "text") {
    return <Button {...props} type={props.type || "button"} variant="ghost" title={title} className={className}>{label}</Button>;
  }
  return <Button {...props} type={props.type || "button"} title={title} className={className}>{icon}{label}</Button>;
}
