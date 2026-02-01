import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let settings = await prisma.payrollSettings.findFirst();

        if (!settings) {
            // Create default settings if none exist
            settings = await prisma.payrollSettings.create({
                data: {
                    epfEnabled: true,
                    epfPercentage: 8.0,
                    etfEnabled: true,
                    etfPercentage: 3.0,
                    taxEnabled: false,
                    taxPercentage: 0.0,
                },
            });
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error fetching payroll settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch payroll settings" },
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

        const userRole = session.user.role?.toLowerCase();
        if (userRole !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { epfEnabled, epfPercentage, etfEnabled, etfPercentage, taxEnabled, taxPercentage } = body;

        let settings = await prisma.payrollSettings.findFirst();

        if (settings) {
            settings = await prisma.payrollSettings.update({
                where: { id: settings.id },
                data: {
                    epfEnabled,
                    epfPercentage,
                    etfEnabled,
                    etfPercentage,
                    taxEnabled,
                    taxPercentage,
                },
            });
        } else {
            settings = await prisma.payrollSettings.create({
                data: {
                    epfEnabled,
                    epfPercentage,
                    etfEnabled,
                    etfPercentage,
                    taxEnabled,
                    taxPercentage,
                },
            });
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error updating payroll settings:", error);
        return NextResponse.json(
            { error: "Failed to update payroll settings" },
            { status: 500 }
        );
    }
}
