/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/mobile/line-summary/route";

const mockGetMobilePrincipal = jest.fn();
const mockLineFindMany = jest.fn();

jest.mock("@/lib/mobile-auth", () => ({ getMobilePrincipal: (...args: unknown[]) => mockGetMobilePrincipal(...args) }));
jest.mock("@/lib/prisma", () => {
  const instance = { lineDetails: { findMany: (...args: unknown[]) => mockLineFindMany(...args) } };
  return { __esModule: true, default: instance, prisma: instance };
});

function request(url: string) {
  return new NextRequest(url, { headers: { authorization: "Bearer mobile-access" } });
}

describe("mobile monthly line summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMobilePrincipal.mockResolvedValue({ userId: "user-1", sessionId: "session-1" });
    mockLineFindMany.mockResolvedValue([
      {
        date: new Date("2026-10-03T00:00:00.000Z"), status: "completed", completedDate: new Date("2026-10-03T00:00:00.000Z"),
        cableStart: 100, cableMiddle: 115, cableEnd: 130,
        workAssignments: [{ worker: { id: "worker-1", fullName: "A. Worker" } }],
      },
      {
        date: new Date("2026-10-03T00:00:00.000Z"), status: "in_progress", completedDate: null,
        cableStart: 130, cableMiddle: 140, cableEnd: 155,
        workAssignments: [{ worker: { id: "worker-1", fullName: "A. Worker" } }, { worker: { id: "worker-2", fullName: "B. Worker" } }],
      },
    ]);
  });

  it("requires a valid mobile session and a valid selected month", async () => {
    mockGetMobilePrincipal.mockResolvedValue(null);
    expect((await GET(request("https://nns.example/api/mobile/line-summary?month=10&year=2026"))).status).toBe(401);
    mockGetMobilePrincipal.mockResolvedValue({ userId: "user-1" });
    expect((await GET(request("https://nns.example/api/mobile/line-summary?month=13&year=2026"))).status).toBe(400);
    expect(mockLineFindMany).not.toHaveBeenCalled();
  });

  it("returns monthly status, cable, daily and crew aggregates without customer fields", async () => {
    const response = await GET(request("https://nns.example/api/mobile/line-summary?month=10&year=2026"));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.month).toBe("2026-10");
    expect(result.totals).toMatchObject({ lines: 2, completed: 1, inProgress: 1, pending: 0, f1: 25, g1: 30, cable: 55 });
    expect(result.daily).toEqual([{ date: "2026-10-03", total: 2, completed: 1, inProgress: 1, f1: 25, g1: 30, cable: 55 }]);
    expect(result.crew).toEqual([
      { workerId: "worker-1", workerName: "A. Worker", lines: 2, completed: 1, cable: 55 },
      { workerId: "worker-2", workerName: "B. Worker", lines: 1, completed: 0, cable: 25 },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/telephoneNo|customer|address/i);
    expect(mockLineFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { date: { gte: new Date("2026-10-01T00:00:00.000Z"), lt: new Date("2026-11-01T00:00:00.000Z") } },
    }));
  });
});
