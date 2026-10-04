/** @jest-environment node */
import { POST } from "@/app/api/settings/email/test/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, prisma: { user: { findUnique: jest.fn() } } }));
jest.mock("@/lib/email-service", () => ({ sendEmail: jest.fn() }));

const authMock = auth as jest.Mock;
const userFindUniqueMock = prisma.user.findUnique as jest.Mock;
const sendEmailMock = sendEmail as jest.Mock;

describe("test email endpoint", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends only to the signed-in administrator and returns the destination", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-id" } });
    userFindUniqueMock.mockResolvedValue({ email: "admin@nns.lk", profile: { role: "admin" } });
    sendEmailMock.mockResolvedValue({ success: true, provider: "smtp" });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "admin@nns.lk", subject: "NNS Email Configuration Test" }));
    expect(await response.json()).toMatchObject({ success: true, provider: "smtp", sentTo: "admin@nns.lk" });
  });
});
