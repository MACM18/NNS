/** @jest-environment node */
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn((_options?: unknown) => ({ sendMail: mockSendMail }));
const mockFindFirst = jest.fn();

jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: (options: unknown) => mockCreateTransport(options) } }));
jest.mock("resend", () => ({ Resend: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, prisma: { emailSettings: { findFirst: () => mockFindFirst() } } }));
jest.mock("@/lib/encryption", () => ({ decrypt: jest.fn() }));

import { clearEmailConfigCache, sendEmail } from "@/lib/email-service";

describe("SMTP environment email fallback", () => {
  const envKeys = ["EMAIL_PROVIDER", "EMAIL_FROM", "EMAIL_FROM_NAME", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD"] as const;
  const previousEnv = new Map<string, string | undefined>();

  beforeAll(() => envKeys.forEach(key => previousEnv.set(key, process.env[key])));
  afterAll(() => envKeys.forEach(key => {
    const value = previousEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    clearEmailConfigCache();
    mockFindFirst.mockResolvedValue(null);
    mockSendMail.mockResolvedValue({ messageId: "smtp-message-id" });
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.EMAIL_FROM = "operations@example.com";
    process.env.EMAIL_FROM_NAME = "NNS Operations";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
  });

  it("sends via SMTP when environment settings are selected", async () => {
    const result = await sendEmail({ to: "recipient@example.com", subject: "Monthly sheet", html: "Ready" });
    expect(result).toMatchObject({ success: true, messageId: "smtp-message-id", provider: "smtp", configSource: "environment" });
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.com", port: 587, secure: false,
      auth: { user: "smtp-user", pass: "smtp-password" },
    }));
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"NNS Operations" <operations@example.com>' }));
  });
});
