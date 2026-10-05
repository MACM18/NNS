/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/monthly-reports/[reportId]/share/email/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMonthlyVersionShare } from "@/lib/monthly-report-service";
import { sendEmail } from "@/lib/email-service";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, prisma: { profile: { findUnique: jest.fn() } } }));
jest.mock("@/lib/monthly-report-service", () => ({ getActiveMonthlyVersionShare: jest.fn() }));
jest.mock("@/lib/email-service", () => ({ escapeEmailHtml: (value: string) => value.replace(/</g, "&lt;"), sendEmail: jest.fn() }));

const authMock = auth as jest.Mock;
const profileMock = prisma.profile.findUnique as jest.Mock;
const activeShareMock = getActiveMonthlyVersionShare as jest.Mock;
const sendMock = sendEmail as jest.Mock;
const request = () => new NextRequest("https://nns.example/api/monthly-reports/report-1/share/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId: "version-2", recipients: ["one@example.com", "two@example.com"] }) });
const context = { params: Promise.resolve({ reportId: "report-1" }) };

describe("email a monthly report share link", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1" } });
    profileMock.mockResolvedValue({ role: "admin" });
    sendMock.mockResolvedValue({ success: true, messageId: "mail-id" });
  });

  it("sends the existing active link separately to each recipient", async () => {
    activeShareMock.mockResolvedValue({ token: "A".repeat(43), version: { version: 2, report: { year: 2026, month: 10 } } });
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ sent: 2, failed: 0 });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(activeShareMock).toHaveBeenCalledWith("report-1", "version-2");
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "one@example.com", subject: "NNS Enterprise monthly reports: October 2026 (version 2)" });
    expect(sendMock.mock.calls[0][0].text).toContain("https://nns.example/reports/shared/");
    expect(sendMock.mock.calls[0][0].text).toContain("Anyone with this link can view");
  });

  it("does not reactivate or email a revoked share link", async () => {
    activeShareMock.mockResolvedValue(null);
    const response = await POST(request(), context);
    expect(response.status).toBe(409);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("requires management permission", async () => {
    profileMock.mockResolvedValue({ role: "user" });
    const response = await POST(request(), context);
    expect(response.status).toBe(403);
    expect(activeShareMock).not.toHaveBeenCalled();
  });
});
