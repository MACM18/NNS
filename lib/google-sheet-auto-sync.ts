import prisma from "@/lib/prisma";

export const SHEET_SYNC_TIME_ZONES = ["Asia/Colombo", "UTC"] as const;
export type SheetSyncTimeZone = (typeof SHEET_SYNC_TIME_ZONES)[number];

export function sheetLocalClock(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const localDate = `${values.year}-${values.month}-${values.day}`;
  return { year, month, localDate, localTime: `${values.hour}:${values.minute}`, period: `${values.year}-${values.month.padStart(2, "0")}` };
}

export function currentSheetPeriod(timeZone: string, now = new Date()) {
  return sheetLocalClock(timeZone, now);
}

export async function reconcileSheetAutoSync(now = new Date()) {
  const settings = await prisma.googleSheetSyncSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const clock = sheetLocalClock(settings.timeZone, now);
  const newest = await prisma.googleSheetConnection.findFirst({
    where: { year: clock.year, month: clock.month },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, sheetName: true, month: true, year: true, autoSyncEnabled: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.googleSheetConnection.updateMany({
      where: {
        autoSyncEnabled: true,
        ...(newest ? { id: { not: newest.id } } : {}),
      },
      data: { autoSyncEnabled: false },
    });
    if (settings.activePeriod !== clock.period) {
      if (newest) {
        await tx.googleSheetConnection.update({
          where: { id: newest.id },
          data: { autoSyncEnabled: true },
        });
      }
      await tx.googleSheetSyncSettings.update({
        where: { id: "default" },
        data: { activePeriod: clock.period },
      });
    }
  });

  return {
    settings: { ...settings, activePeriod: clock.period },
    clock,
    newestConnection: newest
      ? { ...newest, autoSyncEnabled: settings.activePeriod !== clock.period || newest.autoSyncEnabled }
      : null,
  };
}
