/**
 * Small auth utilities for role checks.
 * Accepts either a role string or a profile object containing a `role` field.
 */
type RoleInput = string | { role?: string } | null | undefined;

function getRole(input?: RoleInput) {
  if (!input) return null;
  if (typeof input === "string") return input.toLowerCase();
  if (typeof input === "object" && input.role && typeof input.role === "string")
    return input.role.toLowerCase();
  return null;
}

export function isAdmin(input?: RoleInput) {
  const r = getRole(input);
  return r === "admin" || r === "superadmin";
}

export function isModerator(input?: RoleInput) {
  const r = getRole(input);
  return r === "moderator" || r === "admin";
}

export function hasRole(input: RoleInput, expected: string) {
  const r = getRole(input);
  return r === expected.toLowerCase();
}

export default { isAdmin, isModerator, hasRole };
