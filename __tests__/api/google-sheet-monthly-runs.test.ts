/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/integrations/google-sheets/monthly/runs/route";
import { POST as retryEmailPOST } from "@/app/api/integrations/google-sheets/monthly/runs/[runId]/email/route";
import { POST as manualProvisionPOST } from "@/app/api/integrations/google-sheets/monthly/provision/route";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { provisionMonthlySheet, retryMonthlySheetEmail } from "@/lib/google-sheet-monthly";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: { googleSheetMonthlyRun: { findMany: jest.fn(), findUnique: jest.fn() }, googleSheetConnection: { findFirst: jest.fn() } } }));
jest.mock("@/lib/google-sheet-monthly", () => ({ MONTHLY_SHEET_TIME_ZONE: "Asia/Colombo", provisionMonthlySheet: jest.fn(), retryMonthlySheetEmail: jest.fn() }));
jest.mock("@/lib/google-sheet-auto-sync", () => ({ currentSheetPeriod: () => ({ period: "2026-10", year: 2026, month: 10 }) }));

const authMock = auth as jest.Mock;
const findManyMock = prisma.googleSheetMonthlyRun.findMany as jest.Mock;
const retryMock = retryMonthlySheetEmail as jest.Mock;
const provisionMock = provisionMonthlySheet as jest.Mock;
const runFindUniqueMock = prisma.googleSheetMonthlyRun.findUnique as jest.Mock;
const connectionFindFirstMock = prisma.googleSheetConnection.findFirst as jest.Mock;

describe("monthly Google Sheet run APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectionFindFirstMock.mockResolvedValue(null);
  });

  it("returns recent event timelines to management users only", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "admin" } });
    findManyMock.mockResolvedValue([{ id: "run-id", period: "2026-10", status: "running", events: [] }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ runs: [{ id: "run-id", period: "2026-10", status: "running", events: [] }], currentPeriod: "2026-10", currentConnection: null });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 12, select: expect.objectContaining({ events: true }) }));
    expect(connectionFindFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { year: 2026, month: 10 } }));

    authMock.mockResolvedValue({ user: { id: "viewer-id", role: "user" } });
    expect((await GET()).status).toBe(403);
  });

  it("requires confirmation and rejects a changed current-month connection before provisioning", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "admin" } });
    connectionFindFirstMock.mockResolvedValue({ id: "current-connection", sheetName: "October 2026", sheetUrl: "https://sheet.example", status: "active", autoSyncEnabled: true });
    runFindUniqueMock.mockResolvedValue({ id: "monthly-run", status: "failed", fileUrl: "https://sheet.example" });

    const response = await manualProvisionPOST(new NextRequest("http://localhost/api/integrations/google-sheets/monthly/provision", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true, expectedConnectionId: null, expectedRunId: "monthly-run" }),
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).refreshRequired).toBe(true);
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("only starts provisioning after the reviewed connection and run IDs still match", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "admin" } });
    connectionFindFirstMock.mockResolvedValue({ id: "current-connection", sheetName: "October 2026", sheetUrl: "https://sheet.example", status: "active", autoSyncEnabled: true });
    runFindUniqueMock.mockResolvedValue({ id: "monthly-run", status: "failed", fileUrl: "https://sheet.example" });
    provisionMock.mockResolvedValue({ ok: true, runId: "monthly-run", status: "success", fileUrl: "https://sheet.example" });

    const response = await manualProvisionPOST(new NextRequest("http://localhost/api/integrations/google-sheets/monthly/provision", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true, expectedConnectionId: "current-connection", expectedRunId: "monthly-run" }),
    }));
    expect(response.status).toBe(200);
    expect(provisionMock).toHaveBeenCalledWith("2026-10", "", { manual: true });
  });

  it("allows an admin to retry only the existing run email", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "superadmin" } });
    retryMock.mockResolvedValue({ runId: "run-id", status: "success", fileUrl: "https://sheet.example" });
    const response = await retryEmailPOST(new NextRequest("http://localhost/api/monthly/runs/run-id/email", { method: "POST" }), { params: Promise.resolve({ runId: "run-id" }) });
    expect(response.status).toBe(200);
    expect(retryMock).toHaveBeenCalledWith("run-id");
  });
});
