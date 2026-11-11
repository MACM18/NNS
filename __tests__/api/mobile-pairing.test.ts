/** @jest-environment node */
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as claimPairing } from "@/app/api/mobile/auth/pairing/claim/route";
import { POST as confirmPairing } from "@/app/api/mobile/auth/pairing/confirm/route";

const mockPairingFindUnique = jest.fn();
const mockPairingUpdateMany = jest.fn();
const mockAllowAttempt = jest.fn();
const mockCreateSessionInTransaction = jest.fn();
const mockTransactionCall = jest.fn();

const mockTransaction = {
  mobilePairingRequest: { findUnique: mockPairingFindUnique, updateMany: mockPairingUpdateMany },
};

jest.mock("@/lib/prisma", () => {
  const instance = {
    mobilePairingRequest: { findUnique: (...args: unknown[]) => mockPairingFindUnique(...args), updateMany: (...args: unknown[]) => mockPairingUpdateMany(...args) },
    $transaction: (...args: unknown[]) => mockTransactionCall(...args),
  };
  return { __esModule: true, default: instance, prisma: instance };
});
jest.mock("@/lib/auth-rate-limit", () => ({ allowAuthAttempt: (...args: unknown[]) => mockAllowAttempt(...args) }));
jest.mock("@/lib/mobile-auth", () => ({ createMobileSessionInTransaction: (...args: unknown[]) => mockCreateSessionInTransaction(...args) }));

const rawToken = "a".repeat(43);
const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");
const pairing = {
  id: "a4f08bf0-5349-4a8c-9ded-7f86aa18a817",
  userId: "user-1",
  tokenHash,
  deviceName: "NNS Enterprise Android",
  expiresAt: new Date(Date.now() + 60_000),
  claimedAt: null as Date | null,
  confirmedAt: null as Date | null,
  cancelledAt: null as Date | null,
  user: {
    sessionVersion: 4,
    profile: { fullName: "Test User", email: "test@example.com", role: "admin" },
  },
};

function request(path: string, body: unknown) {
  return new NextRequest(`https://nns.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("mobile QR pairing API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAllowAttempt.mockResolvedValue(true);
    mockPairingFindUnique.mockResolvedValue({ ...pairing });
    mockPairingUpdateMany.mockResolvedValue({ count: 1 });
    mockCreateSessionInTransaction.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
    mockTransactionCall.mockImplementation((callback: (tx: typeof mockTransaction) => unknown) => callback(mockTransaction));
  });

  it("shows the account identity after one valid scan and claims the request once", async () => {
    const response = await claimPairing(request("/api/mobile/auth/pairing/claim", { requestId: pairing.id, token: rawToken, deviceName: "Field phone" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ fullName: "Test User", email: "test@example.com" });
    expect(mockPairingUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: pairing.id, tokenHash, claimedAt: null, confirmedAt: null, cancelledAt: null }),
      data: expect.objectContaining({ deviceName: "Field phone" }),
    }));

    mockPairingUpdateMany.mockResolvedValueOnce({ count: 0 });
    const reused = await claimPairing(request("/api/mobile/auth/pairing/claim", { requestId: pairing.id, token: rawToken }));
    expect(reused.status).toBe(409);
  });

  it("rejects invalid and expired QR codes before claiming them", async () => {
    mockPairingFindUnique.mockResolvedValueOnce({ ...pairing, tokenHash: "0".repeat(64) });
    const invalid = await claimPairing(request("/api/mobile/auth/pairing/claim", { requestId: pairing.id, token: rawToken }));
    expect(invalid.status).toBe(410);
    expect(mockPairingUpdateMany).not.toHaveBeenCalled();

    mockPairingFindUnique.mockResolvedValueOnce({ ...pairing, expiresAt: new Date(Date.now() - 1) });
    const expired = await claimPairing(request("/api/mobile/auth/pairing/claim", { requestId: pairing.id, token: rawToken }));
    expect(expired.status).toBe(410);
    expect(mockPairingUpdateMany).not.toHaveBeenCalled();
  });

  it("creates the normal mobile session only after confirmation and consumes the QR once", async () => {
    mockPairingFindUnique.mockResolvedValue({ ...pairing, claimedAt: new Date() });
    const response = await confirmPairing(request("/api/mobile/auth/pairing/confirm", { requestId: pairing.id, token: rawToken }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: "user-1", email: "test@example.com", fullName: "Test User", role: "admin" },
      accessToken: "access", refreshToken: "refresh",
    });
    expect(mockCreateSessionInTransaction).toHaveBeenCalledWith("user-1", 4, pairing.deviceName, mockTransaction);
    expect(mockPairingUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: pairing.id, tokenHash, claimedAt: { not: null }, confirmedAt: null, cancelledAt: null }),
      data: expect.objectContaining({ confirmedAt: expect.any(Date) }),
    }));

    mockPairingUpdateMany.mockResolvedValueOnce({ count: 0 });
    const reused = await confirmPairing(request("/api/mobile/auth/pairing/confirm", { requestId: pairing.id, token: rawToken }));
    expect(reused.status).toBe(410);
    expect(mockCreateSessionInTransaction).toHaveBeenCalledTimes(1);
  });

  it("rate-limits pairing attempts", async () => {
    mockAllowAttempt.mockResolvedValue(false);
    const response = await claimPairing(request("/api/mobile/auth/pairing/claim", { requestId: pairing.id, token: rawToken }));
    expect(response.status).toBe(429);
    expect(mockPairingFindUnique).not.toHaveBeenCalled();
  });
});
