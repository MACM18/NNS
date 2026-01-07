/**
 * Salary Slip PDF Generator Tests
 * Tests for PDF generation functionality
 */

import { generateSalarySlipPDF } from "@/lib/salary-slip-pdf";
import jsPDF from "jspdf";
import type { WorkerPayment, PayrollPeriod } from "@/types/payroll";

// Mock jsPDF
jest.mock("jspdf");

describe("Salary Slip PDF Generator", () => {
  type MockPDF = {
    internal: {
      pageSize: {
        getWidth: jest.Mock<number, []>;
        getHeight: jest.Mock<number, []>;
      };
    };
    setFillColor: jest.Mock;
    setTextColor: jest.Mock;
    setFontSize: jest.Mock;
    setFont: jest.Mock;
    setDrawColor: jest.Mock;
    rect: jest.Mock;
    text: jest.Mock;
    line: jest.Mock;
    save: jest.Mock;
  };

  let mockPDF: MockPDF;
  let mockPayment: WorkerPayment;
  let mockPeriod: PayrollPeriod;

  beforeEach(() => {
    mockPDF = {
      internal: {
        pageSize: {
          getWidth: jest.fn(() => 210),
          getHeight: jest.fn(() => 297),
        },
      },
      setFillColor: jest.fn(),
      setTextColor: jest.fn(),
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      setDrawColor: jest.fn(),
      rect: jest.fn(),
      text: jest.fn(),
      line: jest.fn(),
      save: jest.fn(),
    };
    (jsPDF as unknown as jest.Mock).mockImplementation(() => mockPDF);

    mockPayment = {
      id: "payment1",
      payrollPeriodId: "period1",
      workerId: "worker1",
      paymentType: "per_line",
      linesCompleted: 10,
      perLineRate: 500,
      baseAmount: 5000,
      bonusAmount: 1000,
      deductionAmount: 500,
      netAmount: 5500,
      status: "approved",
      createdById: "user1",
      createdAt: new Date("2026-01-01").toISOString(),
      updatedAt: new Date("2026-01-01").toISOString(),
      worker: {
        id: "worker1",
        fullName: "John Doe",
        phoneNumber: "+94771234567",
        email: "john@example.com",
        role: "field_worker",
        status: "active",
        paymentType: "per_line",
        perLineRate: 500,
        monthlyRate: null,
        bankName: "Commercial Bank",
        bankBranch: "Colombo",
        accountNumber: "1234567890",
        accountName: "John Doe",
      },
      adjustments: [
        {
          id: "adj1",
          workerPaymentId: "payment1",
          type: "bonus",
          category: "performance_bonus",
          description: "Excellent performance",
          amount: 1000,
          createdById: "user1",
          createdAt: new Date("2026-01-01").toISOString(),
        },
        {
          id: "adj2",
          workerPaymentId: "payment1",
          type: "deduction",
          category: "advance",
          description: "Advance recovery",
          amount: 500,
          createdById: "user1",
          createdAt: new Date("2026-01-01").toISOString(),
        },
      ],
    };

    mockPeriod = {
      id: "period1",
      name: "January 2026",
      month: 1,
      year: 2026,
      startDate: new Date("2026-01-01").toISOString(),
      endDate: new Date("2026-01-31").toISOString(),
      status: "approved",
      totalAmount: 100000,
      createdById: "user1",
      createdAt: new Date("2026-01-01").toISOString(),
      updatedAt: new Date("2026-01-01").toISOString(),
    };
  });

  it("should create a PDF with correct structure", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(jsPDF).toHaveBeenCalledWith({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
  });

  it("should include company header", () => {
    generateSalarySlipPDF({
      payment: mockPayment,
      period: mockPeriod,
      companyName: "NNS Enterprise",
    });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "NNS Enterprise",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should include employee details", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "John Doe",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should display per-line payment details", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      expect.stringContaining("10 lines"),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should display fixed monthly payment details", () => {
    const monthlyPayment = {
      ...mockPayment,
      paymentType: "fixed_monthly" as const,
      linesCompleted: 0,
      perLineRate: null,
    };

    generateSalarySlipPDF({
      payment: monthlyPayment,
      period: mockPeriod,
    });

    expect(mockPDF.text).toHaveBeenCalledWith(
      expect.stringContaining("Monthly Salary"),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should include bonuses section", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "Excellent performance",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should include deductions section", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "Advance recovery",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should display net pay prominently", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "NET PAY",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should include bank details if available", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "Commercial Bank",
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockPDF.text).toHaveBeenCalledWith(
      "1234567890",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("should save PDF with correct filename", () => {
    generateSalarySlipPDF({ payment: mockPayment, period: mockPeriod });

    expect(mockPDF.save).toHaveBeenCalledWith(
      expect.stringContaining("John_Doe")
    );
    expect(mockPDF.save).toHaveBeenCalledWith(
      expect.stringContaining("January_2026")
    );
  });

  it("should handle payment without bank details", () => {
    const paymentWithoutBank = {
      ...mockPayment,
      worker: {
        ...mockPayment.worker!,
        bankName: null,
        bankBranch: null,
        accountNumber: null,
        accountName: null,
      },
    };

    generateSalarySlipPDF({
      payment: paymentWithoutBank,
      period: mockPeriod,
    });

    expect(mockPDF.save).toHaveBeenCalled();
  });

  it("should handle payment without adjustments", () => {
    const paymentWithoutAdjustments = {
      ...mockPayment,
      bonusAmount: 0,
      deductionAmount: 0,
      adjustments: [],
    };

    generateSalarySlipPDF({
      payment: paymentWithoutAdjustments,
      period: mockPeriod,
    });

    expect(mockPDF.save).toHaveBeenCalled();
  });

  it("should use custom company details when provided", () => {
    generateSalarySlipPDF({
      payment: mockPayment,
      period: mockPeriod,
      companyName: "Custom Company",
      companyAddress: "Custom Address",
      companyPhone: "+94 11 1234567",
      companyEmail: "custom@company.com",
    });

    expect(mockPDF.text).toHaveBeenCalledWith(
      "Custom Company",
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockPDF.text).toHaveBeenCalledWith(
      "Custom Address",
      expect.any(Number),
      expect.any(Number)
    );
  });
});
