/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/google-sheet-import/route";
import prisma from "@/lib/prisma";
import { reconcileSheetAutoSync } from "@/lib/google-sheet-auto-sync";
import { syncConnectionForCron } from "@/app/dashboard/integrations/google-sheets/actions";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: { googleSheetAutoSyncRun: { createMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock("@/lib/google-sheet-auto-sync", () => ({ reconcileSheetAutoSync: jest.fn() }));
jest.mock("@/app/dashboard/integrations/google-sheets/actions", () => ({ syncConnectionForCron: jest.fn() }));

const createManyMock = prisma.googleSheetAutoSyncRun.createMany as jest.Mock;
const findUniqueMock = prisma.googleSheetAutoSyncRun.findUnique as jest.Mock;
const updateMock = prisma.googleSheetAutoSyncRun.update as jest.Mock;
const reconcileMock = reconcileSheetAutoSync as jest.Mock;
const syncMock = syncConnectionForCron as jest.Mock;

const request = () => new NextRequest("http://localhost/api/cron/google-sheet-import", { headers: { authorization: "Bearer cron-secret" } });

describe("scheduled Google Sheet import claiming", () => {
  const oldSecret = process.env.CRON_SECRET;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    reconcileMock.mockResolvedValue({ settings: { enabled: true, dailyTime: "02:00" }, clock: { localTime: "02:01", localDate: "2026-10-04" }, newestConnection: { id: "connection-id", autoSyncEnabled: true } });
    syncMock.mockResolvedValue({ total: 12 });
    updateMock.mockResolvedValue({});
  });
  afterAll(() => {
    if (oldSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = oldSecret;
  });

  it("quietly skips when another scheduler already claimed today's date", async () => {
    createManyMock.mockResolvedValue({ count: 0 });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: "Already started today" });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("runs sync only after successfully claiming today's date", async () => {
    createManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue({ id: "run-id" });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledWith({ data: [{ localDate: "2026-10-04", connectionId: "connection-id" }], skipDuplicates: true });
    expect(syncMock).toHaveBeenCalledWith("connection-id", "cron-secret");
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run-id" }, data: { status: "success", finishedAt: expect.any(Date) } }));
  });
});
