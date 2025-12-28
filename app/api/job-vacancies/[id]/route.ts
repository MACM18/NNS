import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.jobVacancy.findUnique({
      where: { id: parseInt(id) },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job vacancy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("Error fetching job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to fetch job vacancy" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Whitelist and map incoming fields to Prisma model field names
    const dataToUpdate: Record<string, unknown> = {};
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.description !== undefined)
      dataToUpdate.description = body.description;
    if (body.requirements !== undefined)
      dataToUpdate.requirements = body.requirements;
    if (body.responsibilities !== undefined)
      dataToUpdate.responsibilities = body.responsibilities;
    if (body.department !== undefined)
      dataToUpdate.department = body.department;
    if (body.location !== undefined) dataToUpdate.location = body.location;
    // employment_type or employmentType -> employmentType
    if (body.employment_type !== undefined)
      dataToUpdate.employmentType = body.employment_type;
    else if (body.employmentType !== undefined)
      dataToUpdate.employmentType = body.employmentType;
    // salary_range or salaryRange -> salaryRange
    if (body.salary_range !== undefined)
      dataToUpdate.salaryRange = body.salary_range;
    else if (body.salaryRange !== undefined)
      dataToUpdate.salaryRange = body.salaryRange;
    if (body.experience_level !== undefined)
      dataToUpdate.experienceLevel = body.experience_level;
    else if (body.experienceLevel !== undefined)
      dataToUpdate.experienceLevel = body.experienceLevel;
    // skills/benefits: ensure arrays
    if (body.skills !== undefined)
      dataToUpdate.skills = Array.isArray(body.skills)
        ? body.skills
        : String(body.skills)
            .split(",")
            .map((s: any) => s.trim());
    if (body.benefits !== undefined)
      dataToUpdate.benefits = Array.isArray(body.benefits)
        ? body.benefits
        : String(body.benefits)
            .split(",")
            .map((s: any) => s.trim());
    // applicaton email/url
    if (body.application_email !== undefined)
      dataToUpdate.applicationEmail = body.application_email;
    else if (body.applicationEmail !== undefined)
      dataToUpdate.applicationEmail = body.applicationEmail;
    if (body.application_url !== undefined)
      dataToUpdate.applicationUrl = body.application_url;
    else if (body.applicationUrl !== undefined)
      dataToUpdate.applicationUrl = body.applicationUrl;
    // status
    if (body.status !== undefined) dataToUpdate.status = body.status;

    // Normalize end date
    const endDateField =
      body.application_deadline ?? body.end_date ?? body.endDate ?? undefined;
    if (
      endDateField !== undefined &&
      endDateField !== null &&
      endDateField !== ""
    ) {
      dataToUpdate.endDate = new Date(endDateField);
    }

    const job = await prisma.jobVacancy.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("Error updating job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to update job vacancy" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.jobVacancy.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to delete job vacancy" },
      { status: 500 }
    );
  }
}
