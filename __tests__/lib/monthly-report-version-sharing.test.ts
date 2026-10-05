/** @jest-environment node */
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  deleteMonthlyReportVersion,
  getPublicMonthlyReport,
  getPublicMonthlyReportDocument,
} from "@/lib/monthly-report-service";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    monthlyReportVersion: { findFirst: jest.fn() },
    monthlyReportDocument: { findFirst: jest.fn() },
    companySettings: { findFirst: jest.fn() },
  },
}));

const db = prisma as unknown as {
  $transaction: jest.Mock;
  monthlyReportVersion: { findFirst: jest.Mock };
  monthlyReportDocument: { findFirst: jest.Mock };
  companySettings: { findFirst: jest.Mock };
};
const token = "A".repeat(43);
const publicId = "B".repeat(32);
const tokenHash = createHash("sha256").update(token).digest("hex");

describe("version-level public report access", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads only the version matched by the share token", async () => {
    db.monthlyReportVersion.findFirst.mockResolvedValue({
      version: 2,
      report: { year: 2026, month: 10 },
      documents: [{ publicId, reportType: "invoice-a", title: "Invoice A", fileName: "invoice-a.pdf" }],
    });
    db.companySettings.findFirst.mockResolvedValue({ companyName: "NNS Enterprise" });
    const report = await getPublicMonthlyReport(token);
    expect(report?.sharedVersion.version).toBe(2);
    expect(report?.sharedVersion.documents).toHaveLength(1);
    expect(db.monthlyReportVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { shareActive: true, shareTokenHash: tokenHash },
    }));
  });

  it("requires the PDF ID and token to belong to the same active version", async () => {
    db.monthlyReportDocument.findFirst.mockResolvedValue(null);
    expect(await getPublicMonthlyReportDocument(token, publicId)).toBeNull();
    expect(db.monthlyReportDocument.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { publicId, version: { shareActive: true, shareTokenHash: tokenHash } },
    }));
    expect(await getPublicMonthlyReportDocument("invalid", publicId)).toBeNull();
    expect(db.monthlyReportDocument.findFirst).toHaveBeenCalledTimes(1);
  });

  it("protects the current version and an actively shared old version from deletion", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      monthlyReport: { findUnique: jest.fn() },
      monthlyReportVersion: { findFirst: jest.fn(), delete: jest.fn() },
    };
    db.$transaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
    tx.monthlyReport.findUnique.mockResolvedValue({ currentVersionId: "version-2" });
    await expect(deleteMonthlyReportVersion("report-1", "version-2")).rejects.toThrow("Publish another version");
    tx.monthlyReport.findUnique.mockResolvedValue({ currentVersionId: "version-3" });
    tx.monthlyReportVersion.findFirst.mockResolvedValue({ id: "version-2", version: 2, shareActive: true });
    await expect(deleteMonthlyReportVersion("report-1", "version-2")).rejects.toThrow("Stop sharing");
    expect(tx.monthlyReportVersion.delete).not.toHaveBeenCalled();
  });
});
