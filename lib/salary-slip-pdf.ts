// Salary Slip PDF Generator for NNS Telecom Management System
import jsPDF from "jspdf";
import type { WorkerPayment, PayrollPeriod } from "@/types/payroll";
import { format } from "date-fns";

interface SalarySlipPDFOptions {
  payment: WorkerPayment;
  period: PayrollPeriod;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
};

export function generateSalarySlipPDF(options: SalarySlipPDFOptions): void {
  const {
    payment,
    period,
    companyName = "NNS Enterprise",
    companyAddress = "Colombo, Sri Lanka",
    companyPhone = "+94 77 123 4567",
    companyEmail = "info@nns.lk",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const headerBg: [number, number, number] = [17, 24, 39]; // Gray-900
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const greenColor: [number, number, number] = [22, 163, 74]; // Green-600
  const redColor: [number, number, number] = [220, 38, 38]; // Red-600
  const lightBg: [number, number, number] = [249, 250, 251]; // Gray-50

  // ========== HEADER ==========
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyAddress, margin, 26);
  doc.text(`${companyPhone} | ${companyEmail}`, margin, 31);

  // Salary Slip Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAYSLIP", pageWidth - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(period.name, pageWidth - margin, 26, { align: "right" });

  y = 50;

  // ========== EMPLOYEE DETAILS ==========
  doc.setTextColor(...textColor);
  doc.setFillColor(...lightBg);
  doc.rect(margin, y, contentWidth, 25, "F");
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, contentWidth, 25, "S");

  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE SUMMARY", margin + 5, y + 2);

  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const col1X = margin + 5;
  const col2X = margin + contentWidth / 2 + 5;

  doc.setTextColor(...mutedColor);
  doc.text("Name:", col1X, y);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(payment.worker?.fullName || "Unknown", col1X + 15, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text("Employee No:", col2X, y);
  doc.setTextColor(...textColor);
  const employeeNo = payment.worker?.employeeNo || payment.worker?.id.slice(-8).toUpperCase() || "N/A";
  doc.text(employeeNo, col2X + 25, y);

  y += 6;
  doc.setTextColor(...mutedColor);
  doc.text("Pay Period:", col1X, y);
  doc.setTextColor(...textColor);
  doc.text(
    `${format(new Date(period.startDate), "dd MMM")} - ${format(
      new Date(period.endDate),
      "dd MMM yyyy"
    )}`,
    col1X + 20,
    y
  );

  doc.setTextColor(...mutedColor);
  doc.text("Designation:", col2X, y);
  doc.setTextColor(...textColor);
  doc.text(payment.worker?.role || "Technician", col2X + 25, y);

  y += 15;

  // ========== EARNINGS SECTION ==========
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", margin + 5, y);
  doc.text("AMOUNT (LKR)", pageWidth - margin - 5, y, { align: "right" });

  y += 4;
  doc.setLineWidth(0.1);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Base Pay
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Basic Salary", margin + 5, y);
  doc.text(formatCurrency(payment.baseAmount).replace("LKR", ""), pageWidth - margin - 5, y, {
    align: "right",
  });

  // Bonuses
  const bonuses = payment.adjustments?.filter((a) => a.type === "bonus") || [];
  bonuses.forEach((bonus) => {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(bonus.category.replace(/_/g, " ").toUpperCase(), margin + 5, y);
    doc.text(formatCurrency(bonus.amount).replace("LKR", ""), pageWidth - margin - 5, y, {
      align: "right",
    });

    if (bonus.description) {
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...mutedColor);
      doc.text(bonus.description || "", margin + 5, y);
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
    }
  });

  y += 10;

  // ========== DEDUCTIONS SECTION ==========
  const deductions = payment.adjustments?.filter((a) => a.type === "deduction") || [];

  if (deductions.length > 0) {
    doc.setDrawColor(...redColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setTextColor(...redColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DEDUCTIONS", margin + 5, y);
    doc.text("AMOUNT (LKR)", pageWidth - margin - 5, y, { align: "right" });

    y += 4;
    doc.setLineWidth(0.1);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    deductions.forEach((deduction) => {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(deduction.category.replace(/_/g, " ").toUpperCase(), margin + 5, y);
      doc.text(`(${formatCurrency(deduction.amount).replace("LKR", "").trim()})`, pageWidth - margin - 5, y, {
        align: "right",
      });

      if (deduction.description) {
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...mutedColor);
        doc.text(deduction.description || "", margin + 5, y);
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
      }
    });

    y += 10;
  }

  // ========== SUMMARY SECTION ==========
  y = Math.max(y, 180); // Move to bottom if not already there

  doc.setFillColor(...lightBg);
  doc.rect(margin, y, contentWidth, 35, "F");
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, contentWidth, 35, "S");

  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gross Earnings:", margin + 5, y);
  doc.text(formatCurrency(payment.baseAmount + payment.bonusAmount), pageWidth - margin - 5, y, { align: "right" });

  y += 6;
  doc.text("Total Deductions:", margin + 5, y);
  doc.text(`(${formatCurrency(payment.deductionAmount)})`, pageWidth - margin - 5, y, { align: "right" });

  y += 8;
  doc.setDrawColor(209, 213, 219);
  doc.line(margin + 5, y, pageWidth - margin - 5, y);

  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("NET TAKE HOME PAY", margin + 5, y);
  doc.text(formatCurrency(payment.netAmount), pageWidth - margin - 5, y, { align: "right" });

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This is a system-generated document and does not require a physical signature.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.text(
    `Reference: ${payment.id.toUpperCase()}`,
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );

  // ========== SAVE PDF ==========
  const fileName = `Payslip_${payment.worker?.fullName?.replace(/\s+/g, "_")}_${period.name.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

export default generateSalarySlipPDF;
