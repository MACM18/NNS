export function monthlyInvoiceNumber(year: string | number, month: string | number, type: "A" | "B") {
  const yearText = String(year);
  const monthNumber = Number(month);
  if (!/^\d{4}$/.test(yearText) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) throw new Error("Invalid invoice month.");
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(Number(yearText), monthNumber - 1, 1))).toUpperCase();
  return `NNS/WPS/HR/NC/${yearText.slice(-2)}/${monthName}/${type}`;
}
