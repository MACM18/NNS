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

    // Normalize incoming data
    const contactNumbers = Array.isArray(body.contact_numbers)
      ? body.contact_numbers
          .map((n: any) => String(n).trim())
          .filter((n: string) => n !== "")
      : [];

    const normalizeTiers = (tiers: any) => {
      if (!tiers) return [];
      if (typeof tiers === "object" && !Array.isArray(tiers)) {
        return Object.entries(tiers).map(([range, rate]) => {
          if (range === "500+")
            return {
              min_length: 501,
              max_length: 999999,
              rate: Number(rate) || 0,
            };
          const [min, max] = range.split("-").map(Number);
          return {
            min_length: Number(min) || 0,
            max_length: Number(max) || 999999,
            rate: Number(rate) || 0,
          };
        });
      }
      if (Array.isArray(tiers)) {
        return tiers.map((t: any) => ({
          min_length: Number(t.min_length) || 0,
          max_length:
            t.max_length === 999999 ||
            String(t.max_length) === "" ||
            t.max_length == null
              ? 999999
              : Number(t.max_length) || 999999,
          rate: Number(t.rate) || 0,
        }));
      }
      return [];
    };

    const pricingTiers = normalizeTiers(body.pricing_tiers);

    const bankDetails =
      body.bank_details && typeof body.bank_details === "object"
        ? {
            bank_name: String(body.bank_details.bank_name ?? ""),
            account_title: String(body.bank_details.account_title ?? ""),
            account_number: String(body.bank_details.account_number ?? ""),
            branch_code: String(body.bank_details.branch_code ?? ""),
            iban: String(body.bank_details.iban ?? ""),
          }
        : null;

    // Check if settings exist
    const existingSettings = await prisma.companySettings.findFirst();

    let settings;
    if (existingSettings) {
      settings = await prisma.companySettings.update({
        where: { id: existingSettings.id },
        data: {
          companyName: body.company_name,
          address: body.address,
          contactNumbers,
          website: body.website,
          registeredNumber: body.registered_number,
          bankDetails: bankDetails ?? undefined,
          pricingTiers,
        },
      });
    } else {
      settings = await prisma.companySettings.create({
        data: {
          companyName: body.company_name || "NNS Enterprise",
          address: body.address,
          contactNumbers,
          website: body.website || "nns.lk",
          registeredNumber: body.registered_number,
          bankDetails: bankDetails ?? undefined,
          pricingTiers,
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
