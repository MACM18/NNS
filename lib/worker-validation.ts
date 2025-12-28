/**
 * Worker and Work Assignment Validation Utilities
 */

import type { CreateWorkerRequest, UpdateWorkerRequest } from "@/types/workers";

/**
 * Validate worker full name
 */
export function validateWorkerName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Full name is required";
  }
  if (name.trim().length < 2) {
    return "Full name must be at least 2 characters";
  }
  if (name.trim().length > 100) {
    return "Full name must not exceed 100 characters";
  }
  return null;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone || phone.trim().length === 0) {
    return null; // Phone is optional
  }

  // Remove spaces and common separators
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Check if it contains only digits and optional + prefix
  if (!/^\+?\d{9,15}$/.test(cleaned)) {
    return "Please enter a valid phone number (9-15 digits)";
  }

  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return null; // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

/**
 * Validate worker data before submission
 */
export function validateWorkerData(
  data: CreateWorkerRequest | UpdateWorkerRequest
): Record<string, string> {
  const errors: Record<string, string> = {};

  // full_name is required for CreateWorkerRequest but optional for UpdateWorkerRequest
  if ("full_name" in data && data.full_name) {
    const nameError = validateWorkerName(data.full_name);
    if (nameError) errors.full_name = nameError;
  } else if (!("id" in data)) {
    // If no id (meaning it's a create request), full_name is required
    errors.full_name = "Full name is required";
  }

  if (data.phone_number) {
    const phoneError = validatePhoneNumber(data.phone_number);
    if (phoneError) errors.phone_number = phoneError;
  }

  if (data.email) {
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  }

  if (data.notes && data.notes.length > 500) {
    errors.notes = "Notes must not exceed 500 characters";
  }

  return errors;
}

/**
 * Validate assignment date
 */
export function validateAssignmentDate(date: string): string | null {
  if (!date) {
    return "Date is required";
  }

  // Check if valid ISO date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return "Date must be in YYYY-MM-DD format";
  }

  // Check if date is valid
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return null;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "";

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Format Sri Lankan numbers (+94 XX XXX XXXX)
  if (cleaned.startsWith("+94")) {
    const number = cleaned.slice(3);
    if (number.length === 9) {
      return `+94 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(
        5
      )}`;
    }
  }

  return phone;
}

/**
 * Sanitize worker input to prevent XSS
 */
export function sanitizeWorkerInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}
