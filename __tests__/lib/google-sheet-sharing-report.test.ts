/** @jest-environment node */
import { sendSheetSharingReport } from "@/lib/google-sheet-monthly";
import { sendEmail } from "@/lib/email-service";

jest.mock("@/lib/email-service", () => ({ escapeEmailHtml: (value: string) => value.replace(/</g, "&lt;"), sendEmail: jest.fn() }));
const sendMock = sendEmail as jest.Mock;

describe("monthly Google Sheet access report email", () => {
  beforeEach(() => { jest.clearAllMocks(); sendMock.mockResolvedValue({ success: true, provider: "smtp", messageId: "report-id" }); });

  it("sends the complete permission result only to the connected Google admin", async () => {
    const result = await sendSheetSharingReport("2026-10", "https://docs.google.com/spreadsheets/d/id/edit", "October Sheet", "drive-admin@example.com", [
      { recipient: "editor@example.com", kind: "user", status: "added" },
      { recipient: "ops@example.com", kind: "group", status: "already_shared" },
      { recipient: "bad@example.com", kind: "user", status: "failed", error: "Invalid recipient" },
    ]);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("drive-admin@example.com");
    expect(sendMock.mock.calls[0][0].html).toContain("editor@example.com");
    expect(sendMock.mock.calls[0][0].html).toContain("Google Group");
    expect(sendMock.mock.calls[0][0].html).toContain("Access failed");
    expect(sendMock.mock.calls[0][0].text).toContain("1 granted, 1 already shared, 1 failed");
    expect(sendMock.mock.calls[0][0].html).toContain("do not confirm delivery of Google invitation emails");
    expect(result).toMatchObject({ sent: true, counts: { added: 1, already_shared: 1, failed: 1 } });
  });

  it("reports missing connected admin email without sending to editors", async () => {
    const result = await sendSheetSharingReport("2026-10", "https://sheet.example", "October", null, [
      { recipient: "editor@example.com", kind: "user", status: "added" },
    ]);
    expect(result.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
