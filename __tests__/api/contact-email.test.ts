/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/route";
import { sendEmail } from "@/lib/email-service";

jest.mock("@/lib/email-service", () => ({
  escapeEmailHtml: (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character),
  sendEmail: jest.fn(),
}));
const sendMock = sendEmail as jest.Mock;

describe("contact form email", () => {
  beforeEach(() => { jest.clearAllMocks(); sendMock.mockResolvedValue({ success: true, messageId: "contact-message" }); });

  it("uses the shared sender and escapes submitted content", async () => {
    const response = await POST(new NextRequest("https://nns.example/api/contact", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "<script>alert(1)</script>", email: "customer@example.com", subject: "Question about services", message: "<img src=x onerror=alert(1)>" }),
    }));
    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "customer@example.com",
      html: expect.stringContaining("&lt;script&gt;"),
      text: expect.stringContaining("<img src=x onerror=alert(1)>"),
    }));
    expect(sendMock.mock.calls[0][0].html).not.toContain("<script>");
  });
});
