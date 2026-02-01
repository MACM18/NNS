// Payroll Summary PDF Generator for NNS Telecom Management System
import jsPDF from "jspdf";
import { format } from "date-fns";
import type { WorkerPayment, PayrollPeriod } from "@/types/payroll";

interface PayrollSummaryPDFOptions {
    period: PayrollPeriod;
    payments: WorkerPayment[];
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

export function generatePayrollSummaryPDF(options: PayrollSummaryPDFOptions): void {
    const {
        period,
        payments,
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

    // Colors (matching salary-slip-pdf.ts)
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
    const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
    const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
    const lightGray: [number, number, number] = [249, 250, 251]; // Gray-50
    const borderColor: [number, number, number] = [229, 231, 235]; // Gray-200

    // ========== HEADER ==========
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, margin, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(companyAddress, margin, 25);
    doc.text(`${companyPhone} | ${companyEmail}`, pageWidth - margin, 25, { align: "right" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYROLL SUMMARY", pageWidth - margin, 18, { align: "right" });

    y = 40;

    // ========== PERIOD DETAILS ==========
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.text("Payroll Period:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(period.name, margin + 30, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Dates:", pageWidth - margin - 60, y);
    doc.setFont("helvetica", "bold");
    doc.text(
        `${format(new Date(period.startDate), "dd MMM yyyy")} - ${format(
            new Date(period.endDate),
            "dd MMM yyyy"
        )}`,
        pageWidth - margin,
        y,
        { align: "right" }
    );

    y += 10;

    // ========== SUMMARY TABLE ==========
    // Table Header
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const cols = {
        name: margin + 5,
        gross: margin + 65,
        epf: margin + 90,
        etf: margin + 115,
        tax: margin + 140,
        netPay: pageWidth - margin - 5,
    };

    doc.text("EMPLOYEE NAME", cols.name, y + 6.5);
    doc.text("GROSS", cols.gross, y + 6.5, { align: "right" });
    doc.text("EPF", cols.epf, y + 6.5, { align: "right" });
    doc.text("ETF", cols.etf, y + 6.5, { align: "right" });
    doc.text("TAX", cols.tax, y + 6.5, { align: "right" });
    doc.text("NET PAY", cols.netPay, y + 6.5, { align: "right" });

    y += 10;
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    // Rows
    payments.forEach((payment, index) => {
        // Alternate row background
        if (index % 2 === 1) {
            doc.setFillColor(...lightGray);
            doc.rect(margin, y, contentWidth, 8, "F");
        }

        const epf = payment.adjustments?.find(a => a.category === "epf")?.amount || 0;
        const etf = payment.adjustments?.find(a => a.category === "etf")?.amount || 0;
        const tax = payment.adjustments?.find(a => a.category === "tax")?.amount || 0;

        doc.text(payment.worker?.fullName || "Unknown", cols.name, y + 5.5);
        doc.text(formatCurrency(payment.baseAmount + payment.bonusAmount), cols.gross, y + 5.5, { align: "right" });
        doc.text(formatCurrency(epf), cols.epf, y + 5.5, { align: "right" });
        doc.text(formatCurrency(etf), cols.etf, y + 5.5, { align: "right" });
        doc.text(formatCurrency(tax), cols.tax, y + 5.5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(payment.netAmount), cols.netPay, y + 5.5, { align: "right" });
        doc.setFont("helvetica", "normal");

        y += 8;

        // Page break check
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    });

    // ========== TOTALS SECTION ==========
    y += 5;
    doc.setDrawColor(...borderColor);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const totalGross = payments.reduce((sum, p) => sum + p.baseAmount + (p.bonusAmount || 0), 0);
    const totalEPF = payments.reduce((sum, p) => sum + (p.adjustments?.find(a => a.category === "epf")?.amount || 0), 0);
    const totalETF = payments.reduce((sum, p) => sum + (p.adjustments?.find(a => a.category === "etf")?.amount || 0), 0);
    const totalTax = payments.reduce((sum, p) => sum + (p.adjustments?.find(a => a.category === "tax")?.amount || 0), 0);
    const totalNet = payments.reduce((sum, p) => sum + p.netAmount, 0);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTALS", margin + 5, y);

    doc.text(formatCurrency(totalGross), cols.gross, y, { align: "right" });
    doc.text(formatCurrency(totalEPF), cols.epf, y, { align: "right" });
    doc.text(formatCurrency(totalETF), cols.etf, y, { align: "right" });
    doc.text(formatCurrency(totalTax), cols.tax, y, { align: "right" });

    doc.setFillColor(...primaryColor);
    doc.rect(cols.netPay - 35, y - 6, 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(formatCurrency(totalNet), cols.netPay, y + 1, { align: "right" });

    // ========== FOOTER ==========
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
        `NNS Enterprise Management System | Generated on ${format(new Date(), "dd MMM yyyy HH:mm")}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
    );

    // ========== SAVE PDF ==========
    const fileName = `Payroll_Summary_${period.name.replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
}

export default generatePayrollSummaryPDF;
