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
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const greenColor: [number, number, number] = [22, 163, 74]; // Green-600
  const redColor: [number, number, number] = [220, 38, 38]; // Red-600

  // ========== HEADER ==========
  // Company Logo/Name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companyAddress, margin, 26);
  doc.text(`${companyPhone} | ${companyEmail}`, margin, 31);

  // Salary Slip Title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SALARY SLIP", pageWidth - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(period.name, pageWidth - margin, 26, { align: "right" });

  y = 45;

  // ========== EMPLOYEE DETAILS ==========
  doc.setTextColor(...textColor);
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(margin, y, contentWidth, 30, "F");
  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.rect(margin, y, contentWidth, 30, "S");

  y += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE DETAILS", margin + 5, y + 3);

  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Employee info in two columns
  const col1X = margin + 5;
  const col2X = margin + contentWidth / 2 + 5;

  doc.setTextColor(...mutedColor);
  doc.text("Employee Name:", col1X, y);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(payment.worker?.fullName || "Unknown", col1X + 30, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text("Employee ID:", col2X, y);
  doc.setTextColor(...textColor);
  doc.text(payment.worker?.id.slice(-8).toUpperCase() || "N/A", col2X + 28, y);

  y += 7;
  doc.setTextColor(...mutedColor);
  doc.text("Payment Type:", col1X, y);
  doc.setTextColor(...textColor);
  doc.text(
    payment.paymentType === "per_line"
      ? "Per Line Completion"
      : "Fixed Monthly",
    col1X + 30,
    y
  );

  doc.setTextColor(...mutedColor);
  doc.text("Period:", col2X, y);
  doc.setTextColor(...textColor);
  doc.text(
    `${format(new Date(period.startDate), "dd MMM")} - ${format(
      new Date(period.endDate),
      "dd MMM yyyy"
    )}`,
    col2X + 28,
    y
  );

  y += 20;

  // ========== EARNINGS SECTION ==========
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EARNINGS", margin + 5, y + 5.5);
  doc.text("AMOUNT", pageWidth - margin - 5, y + 5.5, { align: "right" });

  y += 8;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Base Pay
  y += 6;
  const basePay =
    payment.paymentType === "per_line"
      ? `Base Pay (${payment.linesCompleted} lines × ${formatCurrency(
          payment.perLineRate || 0
        )})`
      : "Base Pay (Monthly Salary)";
  doc.text(basePay, margin + 5, y);
  doc.text(formatCurrency(payment.baseAmount), pageWidth - margin - 5, y, {
    align: "right",
  });

  // Bonuses
  const bonuses = payment.adjustments?.filter((a) => a.type === "bonus") || [];
  bonuses.forEach((bonus) => {
    y += 6;
    doc.setTextColor(...greenColor);
    doc.text(
      bonus.description || bonus.category.replace(/_/g, " "),
      margin + 5,
      y
    );
    doc.text(`+${formatCurrency(bonus.amount)}`, pageWidth - margin - 5, y, {
      align: "right",
    });
  });

  // Gross earnings line
  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text("Gross Earnings", margin + 5, y);
  doc.text(
    formatCurrency(payment.baseAmount + payment.bonusAmount),
    pageWidth - margin - 5,
    y,
    { align: "right" }
  );

  y += 10;

  // ========== DEDUCTIONS SECTION ==========
  const deductions =
    payment.adjustments?.filter((a) => a.type === "deduction") || [];

  if (deductions.length > 0 || payment.deductionAmount > 0) {
    doc.setFillColor(254, 226, 226); // Red-100
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(153, 27, 27); // Red-800
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DEDUCTIONS", margin + 5, y + 5.5);
    doc.text("AMOUNT", pageWidth - margin - 5, y + 5.5, { align: "right" });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    deductions.forEach((deduction) => {
      y += 6;
      doc.setTextColor(...redColor);
      doc.text(
        deduction.description || deduction.category.replace(/_/g, " "),
        margin + 5,
        y
      );
      doc.text(
        `-${formatCurrency(deduction.amount)}`,
        pageWidth - margin - 5,
        y,
        {
          align: "right",
        }
      );
    });

    // Total deductions line
    y += 8;
    doc.setDrawColor(254, 202, 202);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.text("Total Deductions", margin + 5, y);
    doc.text(
      `-${formatCurrency(payment.deductionAmount)}`,
      pageWidth - margin - 5,
      y,
      { align: "right" }
    );

    y += 10;
  }

  // ========== NET PAY SECTION ==========
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, contentWidth, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NET PAY", margin + 5, y + 10);
  doc.setFontSize(14);
  doc.text(formatCurrency(payment.netAmount), pageWidth - margin - 5, y + 10, {
    align: "right",
  });

  y += 25;

  // ========== BANK DETAILS ==========
  if (payment.worker?.bankName) {
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, contentWidth, 25, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, contentWidth, 25, "S");

    y += 5;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT DETAILS", margin + 5, y + 2);

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.setTextColor(...mutedColor);
    doc.text("Bank:", col1X, y);
    doc.setTextColor(...textColor);
    doc.text(payment.worker.bankName, col1X + 20, y);

    if (payment.worker.bankBranch) {
      doc.setTextColor(...mutedColor);
      doc.text("Branch:", col2X, y);
      doc.setTextColor(...textColor);
      doc.text(payment.worker.bankBranch, col2X + 18, y);
    }

    if (payment.worker.accountNumber) {
      y += 7;
      doc.setTextColor(...mutedColor);
      doc.text("Account No:", col1X, y);
      doc.setTextColor(...textColor);
      doc.text(payment.worker.accountNumber, col1X + 25, y);

      if (payment.worker.accountName) {
        doc.setTextColor(...mutedColor);
        doc.text("Account Name:", col2X, y);
        doc.setTextColor(...textColor);
        doc.text(payment.worker.accountName, col2X + 30, y);
      }
    }

    y += 15;
  }

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 30;

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}`,
    margin,
    footerY + 8
  );
  doc.text(
    `Slip Reference: ${payment.id.slice(-12).toUpperCase()}`,
    pageWidth - margin,
    footerY + 8,
    { align: "right" }
  );

  doc.setFontSize(7);
  doc.text(
    "This is a computer-generated document. No signature is required.",
    pageWidth / 2,
    footerY + 15,
    { align: "center" }
  );

  // Signatures section
  y = footerY - 35;
  if (y > 180) {
    // Only add if there's space
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.line(margin, y + 10, margin + 60, y + 10);
    doc.text("Employee Signature", margin, y + 17);

    doc.line(pageWidth - margin - 60, y + 10, pageWidth - margin, y + 10);
    doc.text("Authorized Signature", pageWidth - margin - 60, y + 17);
  }

  // ========== SAVE PDF ==========
  const fileName = `Salary_Slip_${
    payment.worker?.fullName?.replace(/\s+/g, "_") || "Worker"
  }_${period.name.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

export default generateSalarySlipPDF;
