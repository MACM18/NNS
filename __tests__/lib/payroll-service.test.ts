/**
 * Payroll Service Tests
 * Comprehensive tests for payroll calculations, periods, payments, and adjustments
 */

import {
  getPayrollPeriods,
  createPayrollPeriod,
  calculatePayrollForPeriod,
  addAdjustment,
  deleteAdjustment,
  approvePayrollPeriod,
  markPayrollAsPaid,
  getPayrollSummary,
} from "@/lib/payroll-service";
import { prisma } from "@/lib/prisma";

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

describe("Payroll Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPayrollPeriods", () => {
    it("should return paginated payroll periods", async () => {
      const mockPeriods = [
        {
          id: "1",
          name: "January 2026",
          month: 1,
          year: 2026,
          status: "draft",
          totalAmount: new Decimal(100000),
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-01-31"),
          createdById: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
          paidDate: null,
          createdBy: { id: "user1", fullName: "Admin User" },
          _count: { payments: 5 },
        },
      ];

      (prisma.payrollPeriod.findMany as jest.Mock).mockResolvedValue(
        mockPeriods
      );
      (prisma.payrollPeriod.count as jest.Mock).mockResolvedValue(1);

      const result = await getPayrollPeriods();

      expect(result.periods).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.periods[0].status).toBe("draft");
    });

    it("should filter by status", async () => {
      (prisma.payrollPeriod.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payrollPeriod.count as jest.Mock).mockResolvedValue(0);

      await getPayrollPeriods({ status: "approved" });

      expect(prisma.payrollPeriod.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "approved" },
        })
      );
    });

    it("should filter by year", async () => {
      (prisma.payrollPeriod.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payrollPeriod.count as jest.Mock).mockResolvedValue(0);

      await getPayrollPeriods({ year: 2026 });

      expect(prisma.payrollPeriod.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { year: 2026 },
        })
      );
    });
  });

  describe("createPayrollPeriod", () => {
    it("should create a new payroll period", async () => {
      const input = {
        name: "February 2026",
        month: 2,
        year: 2026,
        startDate: "2026-02-01",
        endDate: "2026-02-28",
      };

      const mockPeriod = {
        id: "1",
        ...input,
        status: "draft",
        totalAmount: new Decimal(0),
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdById: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
        paidDate: null,
        createdBy: { id: "user1", fullName: "Admin User" },
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.payrollPeriod.create as jest.Mock).mockResolvedValue(mockPeriod);

      const result = await createPayrollPeriod(input, "user1");

      expect(result.name).toBe("February 2026");
      expect(result.status).toBe("draft");
    });

    it("should throw error if period already exists", async () => {
      const input = {
        name: "February 2026",
        month: 2,
        year: 2026,
        startDate: "2026-02-01",
        endDate: "2026-02-28",
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "1",
      });

      await expect(createPayrollPeriod(input, "user1")).rejects.toThrow(
        "already exists"
      );
    });
  });

  describe("calculatePayrollForPeriod", () => {
    it("should calculate per-line worker payments", async () => {
      const mockWorkers = [
        {
          id: "worker1",
          fullName: "John Doe",
          paymentType: "per_line",
          perLineRate: new Decimal(500),
          status: "active",
        },
      ];

      const mockPeriod = {
        id: "period1",
        status: "draft",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(
        mockPeriod
      );
      (prisma.worker.findMany as jest.Mock).mockResolvedValue(mockWorkers);
      (prisma.workAssignment.count as jest.Mock).mockResolvedValue(10);
      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workerPayment.create as jest.Mock).mockResolvedValue({
        id: "payment1",
        paymentType: "per_line",
        linesCompleted: 10,
        perLineRate: new Decimal(500),
        baseAmount: new Decimal(5000),
        bonusAmount: new Decimal(0),
        deductionAmount: new Decimal(0),
        netAmount: new Decimal(5000),
        worker: mockWorkers[0],
        adjustments: [],
        status: "calculated",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const payments = await calculatePayrollForPeriod("period1", "user1");

      expect(payments).toHaveLength(1);
      expect(payments[0].linesCompleted).toBe(10);
      expect(payments[0].baseAmount).toBe(5000);
    });

    it("should calculate fixed monthly worker payments", async () => {
      const mockWorkers = [
        {
          id: "worker2",
          fullName: "Jane Smith",
          paymentType: "fixed_monthly",
          monthlyRate: new Decimal(50000),
          status: "active",
        },
      ];

      const mockPeriod = {
        id: "period1",
        status: "draft",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(
        mockPeriod
      );
      (prisma.worker.findMany as jest.Mock).mockResolvedValue(mockWorkers);
      (prisma.workerPayment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workerPayment.create as jest.Mock).mockResolvedValue({
        id: "payment2",
        paymentType: "fixed_monthly",
        linesCompleted: 0,
        baseAmount: new Decimal(50000),
        bonusAmount: new Decimal(0),
        deductionAmount: new Decimal(0),
        netAmount: new Decimal(50000),
        worker: mockWorkers[0],
        adjustments: [],
        status: "calculated",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const payments = await calculatePayrollForPeriod("period1", "user1");

      expect(payments).toHaveLength(1);
      expect(payments[0].baseAmount).toBe(50000);
    });
  });

  describe("addAdjustment", () => {
    it("should add a bonus adjustment", async () => {
      const mockPayment = {
        id: "payment1",
        status: "calculated",
        payrollPeriodId: "period1",
        baseAmount: new Decimal(10000),
        bonusAmount: new Decimal(0),
        deductionAmount: new Decimal(0),
        netAmount: new Decimal(10000),
      };

      const mockAdjustment = {
        id: "adj1",
        type: "bonus",
        category: "performance_bonus",
        description: "Good performance",
        amount: new Decimal(2000),
        workerPaymentId: "payment1",
        createdById: "user1",
        createdAt: new Date(),
        createdBy: { id: "user1", fullName: "Admin" },
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
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({});

      const result = await addAdjustment(
        {
          workerPaymentId: "payment1",
          type: "bonus",
          category: "performance_bonus",
          description: "Good performance",
          amount: 2000,
        },
        "user1"
      );

      expect(result.type).toBe("bonus");
      expect(result.amount).toBe(2000);
    });

    it("should throw error for paid payments", async () => {
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
          "user1"
        )
      ).rejects.toThrow("Cannot add adjustments to a paid payment");
    });
  });

  describe("approvePayrollPeriod", () => {
    it("should approve a processing period", async () => {
      const mockPeriod = {
        id: "period1",
        status: "processing",
        payments: [{ id: "payment1" }],
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(
        mockPeriod
      );
      (prisma.workerPayment.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({
        ...mockPeriod,
        status: "approved",
        totalAmount: new Decimal(100000),
        createdBy: { id: "user1", fullName: "Admin" },
      });

      const result = await approvePayrollPeriod("period1");

      expect(result.status).toBe("approved");
      expect(prisma.workerPayment.updateMany).toHaveBeenCalledWith({
        where: { payrollPeriodId: "period1", status: "calculated" },
        data: { status: "approved" },
      });
    });

    it("should throw error if period not processing", async () => {
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "draft",
        payments: [],
      });

      await expect(approvePayrollPeriod("period1")).rejects.toThrow(
        "Can only approve processing payroll periods"
      );
    });
  });

  describe("markPayrollAsPaid", () => {
    it("should mark approved period as paid", async () => {
      const mockPeriod = {
        id: "period1",
        status: "approved",
      };

      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue(
        mockPeriod
      );
      (prisma.workerPayment.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.payrollPeriod.update as jest.Mock).mockResolvedValue({
        ...mockPeriod,
        status: "paid",
        totalAmount: new Decimal(100000),
        paidDate: new Date(),
        createdBy: { id: "user1", fullName: "Admin" },
      });

      const result = await markPayrollAsPaid("period1");

      expect(result.status).toBe("paid");
    });

    it("should throw error if period not approved", async () => {
      (prisma.payrollPeriod.findUnique as jest.Mock).mockResolvedValue({
        id: "period1",
        status: "processing",
      });

      await expect(markPayrollAsPaid("period1")).rejects.toThrow(
        "Can only mark approved payroll periods as paid"
      );
    });
  });

  describe("getPayrollSummary", () => {
    it("should return payroll summary statistics", async () => {
      (prisma.payrollPeriod.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // draft
        .mockResolvedValueOnce(3) // approved
        .mockResolvedValueOnce(5); // paid
      (prisma.payrollPeriod.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: new Decimal(500000) },
      });
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: "period1",
        name: "January 2026",
        status: "processing",
        totalAmount: new Decimal(100000),
        createdBy: { id: "user1", fullName: "Admin" },
      });

      const summary = await getPayrollSummary();

      expect(summary.totalPeriods).toBe(10);
      expect(summary.draftPeriods).toBe(2);
      expect(summary.approvedPeriods).toBe(3);
      expect(summary.paidPeriods).toBe(5);
      expect(summary.totalPaidAmount).toBe(500000);
      expect(summary.currentPeriod?.status).toBe("processing");
    });
  });
});
