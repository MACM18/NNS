import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role || "user").toLowerCase();

    // Get data based on user role
    const exportData: any = {
      profile: null,
      tasks: [],
      lines: [],
      inventory: [],
      invoices: [],
      users: [],
      company: null,
      workers: [],
      workAssignments: [],
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email,
      userRole: role,
    };

    // All users can export their own profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        fullName: true,
        email: true,
        phone: true,
        address: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    exportData.profile = profile;

    // Regular users: Only their own assigned tasks
    if (role === "user" || role === "employee") {
      // Get user's profile first
      const userProfile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      const tasks = await prisma.task.findMany({
        where: { 
          assignedToId: userProfile?.id
        },
        select: {
          id: true,
          telephoneNo: true,
          dp: true,
          customerName: true,
          address: true,
          status: true,
          connectionTypes: true,
          taskDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      exportData.tasks = tasks;
    }

    // Moderators: Operational data (lines, tasks, inventory, invoices)
    if (role === "moderator") {
      const [tasks, lines, inventory, invoices] = await Promise.all([
        prisma.task.findMany({
          select: {
            id: true,
            telephoneNo: true,
            dp: true,
            customerName: true,
            address: true,
            status: true,
            connectionTypes: true,
            taskDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        prisma.lineDetails.findMany({
          select: {
            id: true,
            telephoneNo: true,
            dp: true,
            name: true,
            address: true,
            cableStart: true,
            cableMiddle: true,
            cableEnd: true,
            wastage: true,
            status: true,
            date: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        prisma.inventoryItem.findMany({
          select: {
            id: true,
            name: true,
            currentStock: true,
            unit: true,
            reorderLevel: true,
            drumSize: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.inventoryInvoice.findMany({
          select: {
            id: true,
            invoiceNumber: true,
            warehouse: true,
            date: true,
            totalItems: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);

      exportData.tasks = tasks;
      exportData.lines = lines;
      exportData.inventory = inventory;
      exportData.invoices = invoices;
    }

    // Admins: Full system data export
    if (role === "admin") {
      const [
        tasks,
        lines,
        inventory,
        invoices,
        users,
        company,
        workers,
        workAssignments,
      ] = await Promise.all([
        prisma.task.findMany({
          include: {
            createdBy: {
              select: { fullName: true, email: true },
            },
            assignedTo: {
              select: { fullName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.lineDetails.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.inventoryItem.findMany({
          include: {
            monthlyInventoryUsages: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.generatedInvoice.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.profile.findMany({
          select: {
            id: true,
            userId: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.companySettings.findFirst(),
        prisma.worker.findMany({
          include: {
            createdBy: {
              select: { fullName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.workAssignment.findMany({
          include: {
            worker: {
              select: { fullName: true },
            },
            createdBy: {
              select: { fullName: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);

      exportData.tasks = tasks;
      exportData.lines = lines;
      exportData.inventory = inventory;
      exportData.invoices = invoices;
      exportData.users = users;
      exportData.company = company;
      exportData.workers = workers;
      exportData.workAssignments = workAssignments;
    }

    // Return JSON data
    return NextResponse.json({
      success: true,
      data: exportData,
      recordCounts: {
        profile: exportData.profile ? 1 : 0,
        tasks: exportData.tasks.length,
        lines: exportData.lines.length,
        inventory: exportData.inventory.length,
        invoices: exportData.invoices.length,
        users: exportData.users.length,
        workers: exportData.workers?.length || 0,
        workAssignments: exportData.workAssignments?.length || 0,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
