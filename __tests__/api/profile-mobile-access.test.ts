/** @jest-environment node */
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as createPairing } from "@/app/api/profile/mobile-pairing/route";
import { GET as getMobileSessions, DELETE as revokeMobileSession } from "@/app/api/profile/mobile-sessions/route";

const mockAuth = jest.fn();
const mockRateLimit = jest.fn();
const mockUserFindUnique = jest.fn();
const mockPairingUpdateMany = jest.fn();
const mockPairingDeleteMany = jest.fn();
const mockPairingCreate = jest.fn();
const mockMobileSessionFindMany = jest.fn();
const mockMobileSessionUpdateMany = jest.fn();
const mockTransaction = jest.fn();

const tx = {
  mobilePairingRequest: { updateMany: mockPairingUpdateMany, deleteMany: mockPairingDeleteMany, create: mockPairingCreate },
};

jest.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => mockAuth(...args) }));
jest.mock("@/lib/auth-rate-limit", () => ({ allowAuthAttempt: (...args: unknown[]) => mockRateLimit(...args) }));
jest.mock("@/lib/prisma", () => {
  const instance = {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    mobileSession: {
      findMany: (...args: unknown[]) => mockMobileSessionFindMany(...args),
      updateMany: (...args: unknown[]) => mockMobileSessionUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  };
  return { __esModule: true, default: instance, prisma: instance };
});

function request(method: "POST" | "DELETE", url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("web mobile pairing and device controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRateLimit.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ profile: { id: "profile-1" } });
    mockPairingUpdateMany.mockResolvedValue({ count: 1 });
    mockPairingDeleteMany.mockResolvedValue({ count: 0 });
    mockPairingCreate.mockResolvedValue({});
    mockTransaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    mockMobileSessionFindMany.mockResolvedValue([{ id: "session-1", deviceName: "Android", createdAt: new Date(), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 100_000) }]);
    mockMobileSessionUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("creates a two-minute QR while storing only its hash and replacing old requests", async () => {
    const before = Date.now();
    const response = await createPairing(request("POST", "https://nns.example/api/profile/mobile-pairing"));
    const after = Date.now();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 120_000);
    expect(new Date(result.expiresAt).getTime()).toBeLessThanOrEqual(after + 120_000);
    const token = new URL(result.pairingUrl).searchParams.get("token");
    expect(token).toHaveLength(43);
    expect(mockPairingUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", confirmedAt: null, cancelledAt: null }),
      data: expect.objectContaining({ cancelledAt: expect.any(Date) }),
    }));
    const createArg = mockPairingCreate.mock.calls[0][0];
    expect(createArg.data.tokenHash).toBe(createHash("sha256").update(token!, "utf8").digest("hex"));
    expect(createArg.data.tokenHash).not.toBe(token);
    expect(createArg.data.userId).toBe("user-1");
  });

  it("requires a signed-in web account to create a QR or list devices", async () => {
    mockAuth.mockResolvedValue(null);
    const pairingResponse = await createPairing(request("POST", "https://nns.example/api/profile/mobile-pairing"));
    const sessionsResponse = await getMobileSessions();
    expect(pairingResponse.status).toBe(401);
    expect(sessionsResponse.status).toBe(401);
    expect(mockPairingCreate).not.toHaveBeenCalled();
    expect(mockMobileSessionFindMany).not.toHaveBeenCalled();
  });

  it("lists only the current user’s active devices and revokes only their own session", async () => {
    const list = await getMobileSessions();
    expect(list.status).toBe(200);
    expect(mockMobileSessionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", revokedAt: null, expiresAt: { gt: expect.any(Date) } },
    }));

    const response = await revokeMobileSession(request("DELETE", "https://nns.example/api/profile/mobile-sessions", { sessionId: "session-1" }));
    expect(response.status).toBe(200);
    expect(mockMobileSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "session-1", userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
