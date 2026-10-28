import { portableValue, remapPortableRow, restoreValue } from "@/lib/portable-backup";

describe("portable NNS backups", () => {
  it("encodes report PDF bytes and dates while excluding secret token fields", () => {
    const source = { createdAt: new Date("2026-10-01T00:00:00Z"), pdfBytes: new Uint8Array([1, 2, 3]), shareTokenHash: "secret", encryptedShareToken: "secret" };
    const portable = portableValue(source);
    expect(portable.shareTokenHash).toBeUndefined();
    expect(portable.encryptedShareToken).toBeUndefined();
    expect(portable.pdfBytes).toEqual({ $nnsBytes: "AQID" });
    const restored = restoreValue(portable);
    expect(restored.createdAt).toEqual(source.createdAt);
    expect(Array.from(restored.pdfBytes)).toEqual([1, 2, 3]);
  });

  it("remaps existing profile links and makes restored report versions private", () => {
    const map = new Map([["source-profile", "destination-profile"]]);
    const task = remapPortableRow("task", { createdById: "source-profile", assignedToId: null }, map);
    expect(task.createdById).toBe("destination-profile");
    const report = remapPortableRow("monthlyReportVersion", { createdById: "source-profile", shareActive: true, shareTokenHash: "secret", encryptedShareToken: "secret" }, map);
    expect(report.createdById).toBe("destination-profile");
    expect(report.shareActive).toBe(false);
    expect(report.shareTokenHash).toBeNull();
    expect(report.encryptedShareToken).toBeNull();
    expect(report.shareRevokedAt).toBeInstanceOf(Date);
  });
});
