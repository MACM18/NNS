import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FinancialReports } from "@/components/accounting";

export const metadata: Metadata = {
  title: "Financial Reports | NNS",
  description: "View financial reports and statements",
};

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has accounting access (moderator or above)
  const role = session.user.role || "user";
  if (role === "user") {
    redirect("/dashboard");
  }

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <div className='flex items-center justify-between space-y-2'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Financial Reports
          </h2>
          <p className='text-muted-foreground'>
            View trial balance, income statement, and balance sheet
          </p>
        </div>
      </div>
      <FinancialReports />
    </div>
  );
}
