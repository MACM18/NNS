/**
 * Bounded, linear-time validation for the practical email format accepted by
 * the application. This intentionally avoids backtracking regular expressions
 * on user-controlled input.
 */
export function isValidEmailAddress(input: string): boolean {
  const email = input.trim();
  if (email.length === 0 || email.length > 254) return false;

  for (let index = 0; index < email.length; index += 1) {
    const code = email.charCodeAt(index);
    if (code === 32 || code === 9 || code === 10 || code === 13) return false;
  }

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at >= email.length - 1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || domain.length > 253) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  for (let index = 0; index < local.length; index += 1) {
    const character = local[index];
    const isAlphaNumeric =
      (character >= "a" && character <= "z") ||
      (character >= "A" && character <= "Z") ||
      (character >= "0" && character <= "9");
    if (!isAlphaNumeric && !"!#$%&'*+/=?^_`{|}~.-".includes(character)) return false;
  }

  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63 || label.startsWith("-") || label.endsWith("-")) return false;
    for (let index = 0; index < label.length; index += 1) {
      const character = label[index];
      const isAlphaNumeric =
        (character >= "a" && character <= "z") ||
        (character >= "A" && character <= "Z") ||
        (character >= "0" && character <= "9");
      if (!isAlphaNumeric && character !== "-") return false;
    }
  }

  return true;
}
