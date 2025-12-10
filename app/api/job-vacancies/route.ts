import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.jobVacancies.findMany({
      orderBy: { created_at: "desc" },
    });

    // Transform to snake_case for frontend compatibility
    const transformedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      salary_range: job.salary_range,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      application_deadline: job.application_deadline,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.updated_at,
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

    const job = await prisma.jobVacancies.create({
      data: {
        title: body.title,
        description: body.description,
        department: body.department,
        location: body.location,
        employment_type: body.employment_type,
        salary_range: body.salary_range,
        requirements: body.requirements,
        responsibilities: body.responsibilities,
        benefits: body.benefits,
        application_deadline: body.application_deadline
          ? new Date(body.application_deadline)
          : null,
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
