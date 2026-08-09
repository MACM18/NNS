import { isValidEmailAddress } from "@/lib/email-validation";

describe("email validation", () => {
  it("accepts a normal email address", () => {
    expect(isValidEmailAddress("person@example.com")).toBe(true);
  });

  it("rejects the pathological input reported by CodeQL without backtracking", () => {
    expect(isValidEmailAddress("!@!.".repeat(60))).toBe(false);
  });

  it("rejects malformed domains and duplicate separators", () => {
    expect(isValidEmailAddress("person@example..com")).toBe(false);
    expect(isValidEmailAddress("person@-example.com")).toBe(false);
  });
});
