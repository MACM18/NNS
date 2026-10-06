/** @jest-environment node */
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST, PUT } from "@/app/api/auth/password-reset/route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

const mockUserFindUnique = jest.fn();
const mockResetFindFirst = jest.fn();
const mockResetCreate = jest.fn();
const mockResetDeleteMany = jest.fn();
const mockResetFindUnique = jest.fn();
const mockResetUpdateMany = jest.fn();
const mockUserUpdate = jest.fn();
const mockRateLimitUpsert = jest.fn();
const mockRateLimitDeleteMany = jest.fn();
const mockTxExecuteRaw = jest.fn();
const mockSendEmail = sendEmail as jest.Mock;
const mockTx = {
  passwordResetRequest: {
    findUnique: mockResetFindUnique,
    findFirst: mockResetFindFirst,
    create: mockResetCreate,
    deleteMany: mockResetDeleteMany,
    updateMany: mockResetUpdateMany,
  },
  user: { update: mockUserUpdate },
  $queryRaw: mockTxExecuteRaw,
};

jest.mock("@/lib/prisma", () => {
  const instance = {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    passwordResetRequest: {
      findFirst: (...args: unknown[]) => mockResetFindFirst(...args),
      findUnique: (...args: unknown[]) => mockResetFindUnique(...args),
      create: (...args: unknown[]) => mockResetCreate(...args),
      deleteMany: (...args: unknown[]) => mockResetDeleteMany(...args),
    },
    authRateLimitBucket: {
      upsert: (...args: unknown[]) => mockRateLimitUpsert(...args),
      deleteMany: (...args: unknown[]) => mockRateLimitDeleteMany(...args),
    },
    $transaction: (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
  };
  return { __esModule: true, default: instance, prisma: instance };
});
jest.mock("@/lib/email-service", () => ({ sendEmail: jest.fn() }));
jest.mock("bcryptjs", () => ({ __esModule: true, default: { hash: jest.fn().mockResolvedValue("hashed-password") } }));

const prismaMock = prisma as unknown as { passwordResetRequest: { create: jest.Mock } };
function request(method: "POST" | "PUT", body: unknown) {
  return new NextRequest("https://nns.example/api/auth/password-reset", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("password reset API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetFindFirst.mockResolvedValue(null);
    mockRateLimitUpsert.mockResolvedValue({ count: 1 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });
    mockTxExecuteRaw.mockResolvedValue([]);
    mockResetDeleteMany.mockResolvedValue({ count: 1 });
    mockResetCreate.mockResolvedValue({ id: "reset-id" });
    mockSendEmail.mockResolvedValue({ success: true });
    mockResetFindUnique.mockResolvedValue({ id: "reset-id", userId: "user-1", expiresAt: new Date(Date.now() + 60_000), usedAt: null });
    mockResetUpdateMany.mockResolvedValue({ count: 1 });
    mockUserUpdate.mockResolvedValue({});
  });

  it("returns the same response and sends nothing for an unknown account", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const response = await POST(request("POST", { email: "unknown@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "If an eligible account exists for that email, a password reset link will arrive shortly." });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("stores only a token hash and emails the eligible account a branded reset link", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "person@example.com", password: "existing-hash", profile: { fullName: "Test User" } });
    const response = await POST(request("POST", { email: "PERSON@example.com" }));
    expect(response.status).toBe(200);
    const createArg = mockResetCreate.mock.calls[0][0];
    const email = mockSendEmail.mock.calls[0][0];
    const rawToken = email.html.match(/password-update\?token=([A-Za-z0-9_-]+)/)?.[1];
    expect(rawToken).toHaveLength(43);
    expect(createArg.data.tokenHash).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(createArg.data.tokenHash).not.toBe(rawToken);
    expect(email.subject).toContain("Reset your NNS Enterprise password");
    expect(email.html).toContain("Reset password");
    expect(email.text).toContain("within 30 minutes");
    expect(email.html).not.toContain("<script>");
  });

  it("rejects weak passwords on the server without hashing", async () => {
    const response = await PUT(request("PUT", { token: "A".repeat(43), password: "weakpassword" }));
    expect(response.status).toBe(400);
    expect(require("bcryptjs").default.hash).not.toHaveBeenCalled();
  });

  it("rejects invalid reset tokens before expensive hashing", async () => {
    mockResetFindUnique.mockResolvedValue(null);
    const response = await PUT(request("PUT", { token: "A".repeat(43), password: "StrongPass123!" }));
    expect(response.status).toBe(400);
    expect(require("bcryptjs").default.hash).not.toHaveBeenCalled();
  });

  it("rejects expired or already-used reset links", async () => {
    mockResetFindUnique.mockResolvedValue({ id: "reset-id", userId: "user-1", expiresAt: new Date(Date.now() - 1000), usedAt: null });
    let response = await PUT(request("PUT", { token: "A".repeat(43), password: "StrongPass123!" }));
    expect(response.status).toBe(400);
    expect(mockResetUpdateMany).not.toHaveBeenCalled();

    mockResetFindUnique.mockResolvedValue({ id: "reset-id", userId: "user-1", expiresAt: new Date(Date.now() + 60_000), usedAt: null });
    mockResetUpdateMany.mockResolvedValue({ count: 0 });
    response = await PUT(request("PUT", { token: "A".repeat(43), password: "StrongPass123!" }));
    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("updates the password and consumes the token exactly once", async () => {
    const response = await PUT(request("PUT", { token: "A".repeat(43), password: "StrongPass123!" }));
    expect(response.status).toBe(200);
    expect(mockResetUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "reset-id", usedAt: null }) }));
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" }, data: expect.objectContaining({ password: "hashed-password", sessionVersion: { increment: 1 }, loginAttempts: 0, accountLockedUntil: null }) }));
  });
});

