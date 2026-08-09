import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DELETE, PATCH } from "@/app/api/accounting/partners/[id]/route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: jest.fn() },
    partnershipPartner: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const authMock = auth as jest.Mock;
const prismaMock = prisma as unknown as {
  profile: { findUnique: jest.Mock };
  partnershipPartner: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
  $transaction: jest.Mock;
};

function request(_method: string, body?: unknown) {
  return {
    json: async () => body ?? {},
  } as any;
}

describe("partner lifecycle API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1", role: "admin" });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(prismaMock));
  });

  it("permanently deletes an unused accidental partner", async () => {
    prismaMock.partnershipPartner.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      _count: { allocations: 0, businessTransactions: 0 },
    });
    prismaMock.partnershipPartner.delete.mockResolvedValue({ id: "p1" });

    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ id: "p1" }) });

    expect(response.status).toBe(200);
    expect(prismaMock.partnershipPartner.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("rejects permanent deletion when accounting history exists", async () => {
    prismaMock.partnershipPartner.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      _count: { allocations: 1, businessTransactions: 0 },
    });

    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ id: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("cannot be permanently deleted");
    expect(prismaMock.partnershipPartner.delete).not.toHaveBeenCalled();
  });

  it("allows administrators to archive and restore a partner", async () => {
    prismaMock.partnershipPartner.update.mockResolvedValue({ id: "p1", isActive: false });

    const archiveResponse = await PATCH(request("PATCH", { isActive: false }), { params: Promise.resolve({ id: "p1" }) });
    const restoreResponse = await PATCH(request("PATCH", { isActive: true }), { params: Promise.resolve({ id: "p1" }) });

    expect(archiveResponse.status).toBe(200);
    expect(restoreResponse.status).toBe(200);
    expect(prismaMock.partnershipPartner.update).toHaveBeenNthCalledWith(1, {
      where: { id: "p1" },
      data: { isActive: false },
    });
    expect(prismaMock.partnershipPartner.update).toHaveBeenNthCalledWith(2, {
      where: { id: "p1" },
      data: { isActive: true },
    });
  });

  it("blocks moderators from changing partner records", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1", role: "moderator" });

    const response = await PATCH(request("PATCH", { isActive: false }), { params: Promise.resolve({ id: "p1" }) });

    expect(response.status).toBe(403);
    expect(prismaMock.partnershipPartner.update).not.toHaveBeenCalled();
  });
});
