"use client"

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: any
  [key: string]: any
}

export const useToast = () => {
  return {
    toast: ({ title, description, variant, ...props }: ToastProps) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description, ...props })
      } else {
        sonnerToast(title, { description, ...props })
      }
    },
    dismiss: (id?: string) => sonnerToast.dismiss(id),
  }
}

export const toast = ({ title, description, variant, ...props }: ToastProps) => {
  if (variant === "destructive") {
    sonnerToast.error(title, { description, ...props })
  } else {
    sonnerToast(title, { description, ...props })
  }
}
