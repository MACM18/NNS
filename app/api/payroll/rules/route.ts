import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rules = await prisma.payrollRule.findMany({
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ success: true, data: rules });
    } catch (error) {
        console.error("Failed to fetch payroll rules:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, type, category, percentage, fixedAmount, enabled, description } = body;

        if (!name || !type || !category) {
            return NextResponse.json(
                { error: "Name, type, and category are required" },
                { status: 400 }
            );
        }

        const rule = await prisma.payrollRule.create({
            data: {
                name,
                type,
                category,
                percentage: percentage !== undefined ? percentage : null,
                fixedAmount: fixedAmount !== undefined ? fixedAmount : null,
                enabled: enabled !== undefined ? enabled : true,
                description,
            },
        });

        return NextResponse.json({ success: true, data: rule });
    } catch (error) {
        console.error("Failed to create payroll rule:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
        }

        const rule = await prisma.payrollRule.update({
            where: { id },
            data,
        });

        return NextResponse.json({ success: true, data: rule });
    } catch (error) {
        console.error("Failed to update payroll rule:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
        }

        await prisma.payrollRule.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete payroll rule:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
