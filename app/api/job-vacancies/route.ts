import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.jobVacancy.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Transform to snake_case for frontend compatibility
    const transformedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      department: job.department,
      location: job.location,
      employment_type: job.employmentType,
      salary_range: job.salaryRange,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      application_deadline: job.endDate,
      status: job.status,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    }));

    return NextResponse.json({ data: transformedJobs });
  } catch (error) {
    console.error("Error fetching job vacancies:", error);
    return NextResponse.json(
      { error: "Failed to fetch job vacancies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const job = await prisma.jobVacancy.create({
      data: {
        title: body.title,
        description: body.description,
        department: body.department,
        location: body.location,
        employmentType: body.employment_type ?? body.employmentType,
        salaryRange: body.salary_range ?? body.salaryRange,
        requirements: body.requirements,
        responsibilities: body.responsibilities,
        benefits: body.benefits,
        endDate: body.application_deadline
          ? new Date(body.application_deadline)
          : body.endDate
          ? new Date(body.endDate)
          : new Date(),
        status: body.status || "active",
      },
    });

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("Error creating job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to create job vacancy" },
      { status: 500 }
    );
  }
}
