/** @jest-environment node */
import { POST, DELETE } from "@/app/api/monthly-reports/[reportId]/share/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrGetMonthlyVersionShare, revokeMonthlyVersionShare } from "@/lib/monthly-report-service";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, prisma: { profile: { findUnique: jest.fn() } } }));
jest.mock("@/lib/monthly-report-service", () => ({ createOrGetMonthlyVersionShare: jest.fn(), revokeMonthlyVersionShare: jest.fn() }));

const context = { params: Promise.resolve({ reportId: "report-1" }) };
const request = (method: string, body: unknown) => new Request("https://nns.example/api/monthly-reports/report-1/share", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const authMock = auth as jest.Mock;
const profileMock = prisma.profile.findUnique as jest.Mock;
const createMock = createOrGetMonthlyVersionShare as jest.Mock;
const revokeMock = revokeMonthlyVersionShare as jest.Mock;

describe("version-specific report sharing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1" } });
    profileMock.mockResolvedValue({ role: "admin" });
  });

  it("creates a link for the requested version only", async () => {
    createMock.mockResolvedValue({ token: "A".repeat(43) });
    const response = await POST(request("POST", { versionId: "version-2" }), context);
    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith("report-1", "version-2");
    expect((await response.json()).data).toMatchObject({ versionId: "version-2", shareActive: true });
  });

  it("returns an immediate status payload when one version is revoked", async () => {
    revokeMock.mockResolvedValue({ shareRevokedAt: new Date("2026-10-05T00:00:00Z") });
    const response = await DELETE(request("DELETE", { versionId: "version-2" }), context);
    expect(response.status).toBe(200);
    expect(revokeMock).toHaveBeenCalledWith("report-1", "version-2");
    expect((await response.json()).data).toMatchObject({ versionId: "version-2", shareActive: false });
  });

  it("rejects missing versions and non-manager actions", async () => {
    expect((await POST(request("POST", {}), context)).status).toBe(400);
    profileMock.mockResolvedValue({ role: "user" });
    expect((await DELETE(request("DELETE", { versionId: "version-2" }), context)).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
    expect(revokeMock).not.toHaveBeenCalled();
  });
});
