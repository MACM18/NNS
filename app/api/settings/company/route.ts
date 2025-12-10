import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.companySettings.findFirst();

    if (!settings) {
      return NextResponse.json({
        data: null,
      });
    }

    // Transform to snake_case for frontend
    return NextResponse.json({
      data: {
        id: settings.id,
        company_name: settings.companyName,
        address: settings.address,
        contact_numbers: settings.contactNumbers,
        website: settings.website,
        registered_number: settings.registeredNumber,
        bank_details: settings.bankDetails,
        pricing_tiers: settings.pricingTiers,
        created_at: settings.createdAt.toISOString(),
        updated_at: settings.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch company settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if settings exist
    const existingSettings = await prisma.companySettings.findFirst();

    let settings;
    if (existingSettings) {
      settings = await prisma.companySettings.update({
        where: { id: existingSettings.id },
        data: {
          companyName: body.company_name,
          address: body.address,
          contactNumbers: body.contact_numbers,
          website: body.website,
          registeredNumber: body.registered_number,
          bankDetails: body.bank_details,
          pricingTiers: body.pricing_tiers,
        },
      });
    } else {
      settings = await prisma.companySettings.create({
        data: {
          companyName: body.company_name || "NNS Enterprise",
          address: body.address,
          contactNumbers: body.contact_numbers || [],
          website: body.website || "nns.lk",
          registeredNumber: body.registered_number,
          bankDetails: body.bank_details,
          pricingTiers: body.pricing_tiers,
        },
      });
    }

    return NextResponse.json({
      data: {
        id: settings.id,
        company_name: settings.companyName,
        address: settings.address,
        contact_numbers: settings.contactNumbers,
        website: settings.website,
        registered_number: settings.registeredNumber,
        bank_details: settings.bankDetails,
        pricing_tiers: settings.pricingTiers,
        created_at: settings.createdAt.toISOString(),
        updated_at: settings.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating company settings:", error);
    return NextResponse.json(
      { error: "Failed to update company settings" },
      { status: 500 }
    );
  }
}
