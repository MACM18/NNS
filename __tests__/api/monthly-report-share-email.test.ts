/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/monthly-reports/[reportId]/share/email/route";
import { GET as listRecipients } from "@/app/api/monthly-reports/email-recipients/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMonthlyVersionShare } from "@/lib/monthly-report-service";
import { sendEmail } from "@/lib/email-service";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, prisma: { profile: { findUnique: jest.fn() }, monthlyReportEmailRecipient: { upsert: jest.fn(), findMany: jest.fn() } } }));
jest.mock("@/lib/monthly-report-service", () => ({ getActiveMonthlyVersionShare: jest.fn() }));
jest.mock("@/lib/email-service", () => ({ escapeEmailHtml: (value: string) => value.replace(/</g, "&lt;"), sendEmail: jest.fn() }));

const authMock = auth as jest.Mock;
const profileMock = prisma.profile.findUnique as jest.Mock;
const recipientUpsertMock = prisma.monthlyReportEmailRecipient.upsert as jest.Mock;
const recipientListMock = prisma.monthlyReportEmailRecipient.findMany as jest.Mock;
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
    recipientUpsertMock.mockResolvedValue({});
  });

  it("sends the existing active link separately to each recipient", async () => {
    activeShareMock.mockResolvedValue({ token: "A".repeat(43), version: { version: 2, report: { year: 2026, month: 10 } } });
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ sent: 2, failed: 0 });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(recipientUpsertMock).toHaveBeenCalledTimes(2);
    expect(recipientUpsertMock).toHaveBeenCalledWith({ where: { email: "one@example.com" }, create: { email: "one@example.com" }, update: { lastSentAt: expect.any(Date) } });
    expect(activeShareMock).toHaveBeenCalledWith("report-1", "version-2");
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "one@example.com", subject: "NNS Enterprise monthly reports: October 2026 (version 2)" });
    expect(sendMock.mock.calls[0][0].text).toContain("https://nns.example/reports/shared/");
    expect(sendMock.mock.calls[0][0].text).toContain("Anyone with this link can view");
  });

  it("normalizes and deduplicates recipient addresses before sending", async () => {
    activeShareMock.mockResolvedValue({ token: "A".repeat(43), version: { version: 2, report: { year: 2026, month: 10 } } });
    const duplicateRequest = new NextRequest("https://nns.example/api/monthly-reports/report-1/share/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId: "version-2", recipients: ["One@Example.com", " one@example.com "] }),
    });
    const response = await POST(duplicateRequest, context);
    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("one@example.com");
    expect(recipientUpsertMock).toHaveBeenCalledTimes(1);
  });

  it("saves only recipients whose messages were accepted", async () => {
    activeShareMock.mockResolvedValue({ token: "A".repeat(43), version: { version: 2, report: { year: 2026, month: 10 } } });
    sendMock.mockImplementation(async ({ to }: { to: string }) => to === "one@example.com" ? { success: true } : { success: false, error: "Rejected" });
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(recipientUpsertMock).toHaveBeenCalledTimes(1);
    expect(recipientUpsertMock).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "one@example.com" } }));
  });

  it("does not save a recipient when sending fails", async () => {
    activeShareMock.mockResolvedValue({ token: "A".repeat(43), version: { version: 2, report: { year: 2026, month: 10 } } });
    sendMock.mockResolvedValue({ success: false, error: "Rejected" });
    const response = await POST(request(), context);
    expect(response.status).toBe(502);
    expect(recipientUpsertMock).not.toHaveBeenCalled();
  });

  it("does not reactivate or email a revoked share link", async () => {
    activeShareMock.mockResolvedValue(null);
    const response = await POST(request(), context);
    expect(response.status).toBe(409);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("requires management permission for sending and retrieving recipient suggestions", async () => {
    profileMock.mockResolvedValue({ role: "user" });
    const response = await POST(request(), context);
    expect(response.status).toBe(403);
    expect(activeShareMock).not.toHaveBeenCalled();
    const listResponse = await listRecipients();
    expect(listResponse.status).toBe(403);
    expect(recipientListMock).not.toHaveBeenCalled();
  });

  it("lists recent addresses for management users", async () => {
    recipientListMock.mockResolvedValue([{ email: "recent@example.com", lastSentAt: new Date("2026-10-05T00:00:00Z") }]);
    const response = await listRecipients();
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].email).toBe("recent@example.com");
    expect(recipientListMock).toHaveBeenCalledWith({ orderBy: { lastSentAt: "desc" }, take: 50, select: { email: true, lastSentAt: true } });
  });
});
