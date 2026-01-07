/**
 * Integration Tests for Accounting Workflows
 * End-to-end tests for complete accounting operations
 */

import { prisma } from "@/lib/prisma";
import {
  createPayrollPeriod,
  calculatePayrollForPeriod,
  addAdjustment,
  approvePayrollPeriod,
  markPayrollAsPaid,
} from "@/lib/payroll-service";

// Define Decimal class for tests
class Decimal {
  private value: number;

  constructor(value: number | string) {
    this.value = typeof value === "string" ? parseFloat(value) : value;
  }

  toNumber(): number {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    payrollPeriod: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    workerPayment: {
      findMany: jest.fn(() => Promise.resolve([])),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payrollAdjustment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    worker: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    workAssignment: {
      count: jest.fn(),
    },
  },
}));

describe("Accounting & Payroll Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Payroll Workflow", () => {
    it("should complete full payroll cycle: create → calculate → adjust → approve → pay", async () => {
      // Step 1: Create Period
      const periodInput = {
        name: "January 2026",
        month: 1,
        year: 2026,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };

      const mockPeriod = {
        id: "period1",
        ...periodInput,
        status: "draft",
        totalAmount: new Decimal(0),
        startDate: new Date(periodInput.startDate),
        endDate: new Date(periodInput.endDate),
        createdById: "admin1",
        createdAt: new Date(),
        updatedAt: new Date(),
        paidDate: null,
        createdBy: { id: "admin1", fullName: "Admin User" },
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.payrollPeriod.create as jest.Mock).mockResolvedValue(mockPeriod);

      const period = await createPayrollPeriod(periodInput, "admin1");
      expect(period.status).toBe("draft");

      // Step 2: Calculate Payroll
      const mockWorkers = [
        {
          id: "worker1",
          fullName: "Worker One",
          paymentType: "per_line",
          perLineRate: new Decimal(500),
          status: "active",
        },
        {
          id: "worker2",
          fullName: "Worker Two",
          paymentType: "fixed_monthly",
          monthlyRate: new Decimal(50000),
          status: "active",
        },
      ];

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "draft",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });
      (prisma.worker.findMany as jest.Mock).mockResolvedValue(mockWorkers);
      (prisma.workAssignment.count as jest.Mock).mockResolvedValue(10);
      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workerPayment.create as jest.Mock)
        .mockResolvedValueOnce({
          id: "payment1",
          paymentType: "per_line",
          linesCompleted: 10,
          perLineRate: new Decimal(500),
          baseAmount: new Decimal(5000),
          bonusAmount: new Decimal(0),
          deductionAmount: new Decimal(0),
          netAmount: new Decimal(5000),
          status: "calculated",
          worker: mockWorkers[0],
          adjustments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: "payment2",
          paymentType: "fixed_monthly",
          linesCompleted: 0,
          baseAmount: new Decimal(50000),
          bonusAmount: new Decimal(0),
          deductionAmount: new Decimal(0),
          netAmount: new Decimal(50000),
          status: "calculated",
          worker: mockWorkers[1],
          adjustments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const payments = await calculatePayrollForPeriod("period1", "admin1");
      expect(payments).toHaveLength(2);
      expect(payments[0].baseAmount).toBe(5000);
      expect(payments[1].baseAmount).toBe(50000);

      // Step 3: Add Adjustments
      const mockPayment = {
        id: "payment1",
        status: "calculated",
        payrollPeriodId: "period1",
        baseAmount: new Decimal(5000),
        bonusAmount: new Decimal(0),
        deductionAmount: new Decimal(0),
        netAmount: new Decimal(5000),
      };

      const mockAdjustment = {
        id: "adj1",
        type: "bonus",
        category: "performance_bonus",
        description: "Good work",
        amount: new Decimal(1000),
        workerPaymentId: "payment1",
        createdById: "admin1",
        createdAt: new Date(),
        createdBy: { id: "admin1", fullName: "Admin" },
      };

      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue(
        mockPayment
      );
      (prisma.payrollAdjustment.create as jest.Mock).mockResolvedValue(
        mockAdjustment
      );
      (prisma.payrollAdjustment.findMany as jest.Mock).mockResolvedValue([
        mockAdjustment,
      ]);
      (prisma.workerPayment.update as jest.Mock).mockResolvedValue({});

      const adjustment = await addAdjustment(
        {
          workerPaymentId: "payment1",
          type: "bonus",
          category: "performance_bonus",
          description: "Good work",
          amount: 1000,
        },
        "admin1"
      );
      expect(adjustment.type).toBe("bonus");

      // Step 4: Approve Period
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "processing",
        payments: [{ id: "payment1" }, { id: "payment2" }],
      });
      (prisma.workerPayment.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "approved",
        totalAmount: new Decimal(56000),
        createdBy: { id: "admin1", fullName: "Admin" },
      });

      const approvedPeriod = await approvePayrollPeriod("period1");
      expect(approvedPeriod.status).toBe("approved");

      // Step 5: Mark as Paid
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "approved",
      });
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "paid",
        totalAmount: new Decimal(56000),
        paidDate: new Date(),
        createdBy: { id: "admin1", fullName: "Admin" },
      });

      const paidPeriod = await markPayrollAsPaid("period1");
      expect(paidPeriod.status).toBe("paid");
    });

    it("should enforce workflow state transitions", async () => {
      // Cannot approve draft period
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "draft",
        payments: [],
      });

      await expect(approvePayrollPeriod("period1")).rejects.toThrow(
        "Can only approve processing payroll periods"
      );

      // Cannot pay draft period
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "draft",
      });

      await expect(markPayrollAsPaid("period1")).rejects.toThrow(
        "Can only mark approved payroll periods as paid"
      );

      // Cannot add adjustments to paid payments
      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue({
        id: "payment1",
        status: "paid",
      });

      await expect(
        addAdjustment(
          {
            workerPaymentId: "payment1",
            type: "bonus",
            category: "performance_bonus",
            description: "Test",
            amount: 1000,
          },
          "admin1"
        )
      ).rejects.toThrow("Cannot add adjustments to a paid payment");
    });
  });

  describe("Multi-worker Payroll Calculations", () => {
    it("should handle multiple workers with different payment types", async () => {
      const mockWorkers = [
        {
          id: "w1",
          fullName: "Per Line Worker",
          paymentType: "per_line",
          perLineRate: new Decimal(500),
          status: "active",
        },
        {
          id: "w2",
          fullName: "Monthly Worker",
          paymentType: "fixed_monthly",
          monthlyRate: new Decimal(50000),
          status: "active",
        },
        {
          id: "w3",
          fullName: "Another Per Line",
          paymentType: "per_line",
          perLineRate: new Decimal(600),
          status: "active",
        },
      ];

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "draft",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });
      (prisma.worker.findMany as jest.Mock).mockResolvedValue(mockWorkers);
      (prisma.workAssignment.count as jest.Mock)
        .mockResolvedValueOnce(10) // w1
        .mockResolvedValueOnce(15); // w3
      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workerPayment.create as jest.Mock)
        .mockResolvedValueOnce({
          id: "p1",
          baseAmount: new Decimal(5000),
          netAmount: new Decimal(5000),
          worker: mockWorkers[0],
          status: "calculated",
          paymentType: "per_line",
          linesCompleted: 10,
          adjustments: [],
        })
        .mockResolvedValueOnce({
          id: "p2",
          baseAmount: new Decimal(50000),
          netAmount: new Decimal(50000),
          worker: mockWorkers[1],
          status: "calculated",
          paymentType: "fixed_monthly",
          linesCompleted: 0,
          adjustments: [],
        })
        .mockResolvedValueOnce({
          id: "p3",
          baseAmount: new Decimal(9000),
          netAmount: new Decimal(9000),
          worker: mockWorkers[2],
          status: "calculated",
          paymentType: "per_line",
          linesCompleted: 15,
          adjustments: [],
        });
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const payments = await calculatePayrollForPeriod("period1", "admin1");

      expect(payments).toHaveLength(3);
      expect(payments[0].baseAmount).toBe(5000);
      expect(payments[1].baseAmount).toBe(50000);
      expect(payments[2].baseAmount).toBe(9000);
    });
  });
});
