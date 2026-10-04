/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/integrations/google-sheets/monthly/runs/route";
import { POST } from "@/app/api/integrations/google-sheets/monthly/runs/[runId]/email/route";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { retryMonthlySheetEmail } from "@/lib/google-sheet-monthly";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: { googleSheetMonthlyRun: { findMany: jest.fn() } } }));
jest.mock("@/lib/google-sheet-monthly", () => ({ retryMonthlySheetEmail: jest.fn() }));

const authMock = auth as jest.Mock;
const findManyMock = prisma.googleSheetMonthlyRun.findMany as jest.Mock;
const retryMock = retryMonthlySheetEmail as jest.Mock;

describe("monthly Google Sheet run APIs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns recent event timelines to management users only", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "admin" } });
    findManyMock.mockResolvedValue([{ id: "run-id", period: "2026-10", status: "running", events: [] }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ runs: [{ id: "run-id", period: "2026-10", status: "running", events: [] }] });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 12, select: expect.objectContaining({ events: true }) }));

    authMock.mockResolvedValue({ user: { id: "viewer-id", role: "user" } });
    expect((await GET()).status).toBe(403);
  });

  it("allows an admin to retry only the existing run email", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "superadmin" } });
    retryMock.mockResolvedValue({ runId: "run-id", status: "success", fileUrl: "https://sheet.example" });
    const response = await POST(new NextRequest("http://localhost/api/monthly/runs/run-id/email", { method: "POST" }), { params: Promise.resolve({ runId: "run-id" }) });
    expect(response.status).toBe(200);
    expect(retryMock).toHaveBeenCalledWith("run-id");
  });
});
