import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchPattern = `%${query}%`;

    // Search line_details
    const lines = await prisma.lineDetails.findMany({
      where: {
        OR: [
          { telephone_no: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        telephone_no: true,
        name: true,
        address: true,
      },
      take: 3,
    });

    // Search tasks
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { customer_name: { contains: query, mode: "insensitive" } },
          { telephone_no: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { dp: { contains: query, mode: "insensitive" } },
          { notes: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        customer_name: true,
        telephone_no: true,
        address: true,
        status: true,
        dp: true,
        notes: true,
      },
      take: 3,
    });

    // Search generated_invoices
    const invoices = await prisma.generatedInvoice.findMany({
      where: {
        AND: [
          { invoice_type: { in: ["A", "B"] } },
          { invoice_number: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        invoice_number: true,
        customer_name: true,
        total_amount: true,
      },
      take: 3,
    });

    // Search inventory_items
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        current_stock: true,
        unit: true,
      },
      take: 3,
    });

    // Format results
    type LineResult = (typeof lines)[number];
    type TaskResult = (typeof tasks)[number];
    type InvoiceResult = (typeof invoices)[number];
    type InventoryResult = (typeof inventory)[number];

    const results = [
      ...lines.map((line: LineResult) => ({
        id: line.id,
        type: "line" as const,
        title: line.telephone_no || line.name || "Line",
        subtitle:
          [line.telephone_no, line.name, line.address]
            .filter(Boolean)
            .join(" • ") || "No details",
        data: line,
      })),
      ...tasks.map((task: TaskResult) => ({
        id: task.id,
        type: "task" as const,
        title: task.customer_name || task.telephone_no || "Task",
        subtitle:
          [
            task.telephone_no,
            task.address,
            task.status ? `Status: ${task.status}` : null,
          ]
            .filter(Boolean)
            .join(" • ") || "No details",
        data: task,
      })),
      ...invoices.map((invoice: InvoiceResult) => ({
        id: invoice.id,
        type: "invoice" as const,
        title: invoice.invoice_number || "Invoice",
        subtitle: invoice.customer_name
          ? `${invoice.customer_name}${
              invoice.total_amount != null
                ? ` • LKR ${Number(invoice.total_amount).toLocaleString()}`
                : ""
            }`
          : invoice.total_amount != null
          ? `LKR ${Number(invoice.total_amount).toLocaleString()}`
          : "",
        data: invoice,
      })),
      ...inventory.map((item: InventoryResult) => ({
        id: item.id,
        type: "inventory" as const,
        title: item.name || "Inventory Item",
        subtitle:
          item.current_stock != null
            ? `Stock: ${item.current_stock}${item.unit ? ` ${item.unit}` : ""}`
            : "",
        data: item,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

// Advanced search with filters
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = await req.json();
    const searchResults: any[] = [];

    // Helper function to calculate relevance
    const calculateRelevance = (
      query: string,
      fields: (string | undefined)[]
    ): number => {
      if (!query) return 1;
      const q = query.toLowerCase();
      let score = 0;
      fields.forEach((field) => {
        if (field) {
          const f = field.toLowerCase();
          if (f === q) score += 100;
          else if (f.startsWith(q)) score += 80;
          else if (f.includes(q)) score += 50;
        }
      });
      return score || 1;
    };

    // Search Lines
    if (filters.categories?.includes("line")) {
      const lineWhere: any = {};

      if (filters.query?.trim()) {
        lineWhere.OR = [
          { telephone_no: { contains: filters.query, mode: "insensitive" } },
          { name: { contains: filters.query, mode: "insensitive" } },
          { address: { contains: filters.query, mode: "insensitive" } },
        ];
      }

      if (filters.lineStatus && filters.lineStatus !== "all") {
        lineWhere.completed = filters.lineStatus === "completed";
      }

      if (filters.lengthRange?.min) {
        lineWhere.total_cable = {
          ...lineWhere.total_cable,
          gte: filters.lengthRange.min,
        };
      }

      if (filters.lengthRange?.max) {
        lineWhere.total_cable = {
          ...lineWhere.total_cable,
          lte: filters.lengthRange.max,
        };
      }

      if (filters.dateRange?.from) {
        lineWhere.date = {
          ...lineWhere.date,
          gte: new Date(filters.dateRange.from),
        };
      }

      if (filters.dateRange?.to) {
        lineWhere.date = {
          ...lineWhere.date,
          lte: new Date(filters.dateRange.to),
        };
      }

      const lines = await prisma.lineDetails.findMany({
        where: lineWhere,
        take: 50,
      });

      lines.forEach((line: any) => {
        const telephone = String(line.telephone_no ?? "");
        const customerName = String(line.customer_name ?? line.name ?? "");
        const addr = String(line.address ?? "");
        const lengthValue =
          line.total_cable != null ? Number(line.total_cable) : undefined;
        const relevanceScore = calculateRelevance(filters.query || "", [
          telephone,
          customerName,
          addr,
        ]);

        searchResults.push({
          id: String(line.id),
          type: "line",
          title: telephone || customerName || "Line",
          subtitle:
            [telephone, customerName].filter(Boolean).join(" • ") || "Line",
          description:
            [
              addr ? `Address: ${addr}` : null,
              lengthValue != null && Number.isFinite(lengthValue)
                ? `Length: ${lengthValue}m`
                : null,
            ]
              .filter(Boolean)
              .join(" • ") || "No additional details",
          relevanceScore,
          metadata: line,
        });
      });
    }

    // Search Tasks
    if (filters.categories?.includes("task")) {
      const taskWhere: any = {};

      if (filters.query?.trim()) {
        taskWhere.OR = [
          { telephone_no: { contains: filters.query, mode: "insensitive" } },
          { customer_name: { contains: filters.query, mode: "insensitive" } },
          { address: { contains: filters.query, mode: "insensitive" } },
          { dp: { contains: filters.query, mode: "insensitive" } },
          { notes: { contains: filters.query, mode: "insensitive" } },
        ];
      }

      if (filters.taskStatus && filters.taskStatus !== "all") {
        taskWhere.status = filters.taskStatus;
      }

      if (filters.taskPriority && filters.taskPriority !== "all") {
        taskWhere.priority = filters.taskPriority;
      }

      if (filters.dateRange?.from) {
        taskWhere.created_at = {
          ...taskWhere.created_at,
          gte: new Date(filters.dateRange.from),
        };
      }

      if (filters.dateRange?.to) {
        taskWhere.created_at = {
          ...taskWhere.created_at,
          lte: new Date(filters.dateRange.to),
        };
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        take: 50,
      });

      tasks.forEach((task: any) => {
        const telephone = String(task.telephone_no ?? "");
        const customerName = String(task.customer_name ?? "");
        const addr = String(task.address ?? "");
        const status = String(task.status ?? "");
        const dp = String(task.dp ?? "");
        const notes = String(task.notes ?? "");
        const taskDate = String(task.task_date ?? "");
        const connectionType = String(task.connection_type_new ?? "");
        const title =
          customerName || telephone || dp || `Task ${String(task.id ?? "")}`;
        const relevanceScore = calculateRelevance(filters.query || "", [
          customerName,
          telephone,
          addr,
          dp,
          notes,
        ]);

        searchResults.push({
          id: String(task.id),
          type: "task",
          title,
          subtitle:
            [telephone, addr, taskDate ? `Task Date: ${taskDate}` : null]
              .filter(Boolean)
              .join(" • ") || "Task",
          description:
            [
              addr ? `Address: ${addr}` : null,
              dp ? `DP: ${dp}` : null,
              status ? `Status: ${status}` : null,
              connectionType ? `Connection: ${connectionType}` : null,
              notes ? `Notes: ${notes}` : null,
            ]
              .filter(Boolean)
              .join(" • ") || "No additional details",
          relevanceScore,
          metadata: task,
        });
      });
    }

    // Search Invoices
    if (filters.categories?.includes("invoice")) {
      const invoiceWhere: any = {
        invoice_type: { in: ["A", "B"] },
      };

      if (filters.query?.trim()) {
        invoiceWhere.OR = [
          { invoice_number: { contains: filters.query, mode: "insensitive" } },
          { customer_name: { contains: filters.query, mode: "insensitive" } },
        ];
      }

      if (filters.invoiceType && filters.invoiceType !== "all") {
        invoiceWhere.invoice_type = filters.invoiceType;
      }

      if (filters.amountRange?.min) {
        invoiceWhere.total_amount = {
          ...invoiceWhere.total_amount,
          gte: filters.amountRange.min,
        };
      }

      if (filters.amountRange?.max) {
        invoiceWhere.total_amount = {
          ...invoiceWhere.total_amount,
          lte: filters.amountRange.max,
        };
      }

      if (filters.dateRange?.from) {
        invoiceWhere.created_at = {
          ...invoiceWhere.created_at,
          gte: new Date(filters.dateRange.from),
        };
      }

      if (filters.dateRange?.to) {
        invoiceWhere.created_at = {
          ...invoiceWhere.created_at,
          lte: new Date(filters.dateRange.to),
        };
      }

      const invoices = await prisma.generatedInvoice.findMany({
        where: invoiceWhere,
        take: 50,
      });

      invoices.forEach((invoice: any) => {
        const invNo = String(invoice.invoice_number ?? "");
        const cust = String(invoice.customer_name ?? "");
        const tel = String(invoice.telephone_no ?? "");
        const total = Number(invoice.total_amount ?? 0);
        const type = String(invoice.invoice_type ?? "");
        const relevanceScore = calculateRelevance(filters.query || "", [
          invNo,
          cust,
          tel,
        ]);

        searchResults.push({
          id: String(invoice.id),
          type: "invoice",
          title: invNo || "Invoice",
          subtitle: cust,
          description: `LKR ${total.toLocaleString()}${
            type ? ` • ${type}` : ""
          }`,
          relevanceScore,
          metadata: invoice,
        });
      });
    }

    // Search Inventory
    if (filters.categories?.includes("inventory")) {
      const inventoryWhere: any = {};

      if (filters.query?.trim()) {
        inventoryWhere.OR = [
          { name: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { category: { contains: filters.query, mode: "insensitive" } },
        ];
      }

      if (filters.dateRange?.from) {
        inventoryWhere.created_at = {
          ...inventoryWhere.created_at,
          gte: new Date(filters.dateRange.from),
        };
      }

      if (filters.dateRange?.to) {
        inventoryWhere.created_at = {
          ...inventoryWhere.created_at,
          lte: new Date(filters.dateRange.to),
        };
      }

      let inventory = await prisma.inventoryItem.findMany({
        where: inventoryWhere,
        take: 100,
      });

      // Client-side filter for low stock
      if (filters.inventoryLowStock) {
        inventory = inventory.filter((item: any) => {
          return (
            Number(item.current_stock ?? 0) < Number(item.reorder_level ?? 0)
          );
        });
      }

      inventory.slice(0, 50).forEach((item: any) => {
        const name = String(item.name ?? "");
        const desc = String(item.description ?? "");
        const cat = String(item.category ?? "");
        const stock = Number(item.current_stock ?? 0);
        const relevanceScore = calculateRelevance(filters.query || "", [
          name,
          desc,
          cat,
        ]);

        searchResults.push({
          id: String(item.id),
          type: "inventory",
          title: name || "Item",
          subtitle: cat,
          description: `Stock: ${stock}${desc ? ` • ${desc}` : ""}`,
          relevanceScore,
          metadata: item,
        });
      });
    }

    // Sort by relevance
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({ data: searchResults });
  } catch (error) {
    console.error("Advanced search error:", error);
    return NextResponse.json(
      { error: "Advanced search failed" },
      { status: 500 }
    );
  }
}
