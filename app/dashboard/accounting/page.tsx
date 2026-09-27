import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountingSummaryDashboard } from "@/components/accounting";

export const metadata: Metadata = {
  title: "Accounting | NNS",
  description: "Accounting dashboard and financial management",
};

export default async function AccountingPage() {
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
    <div className='min-w-0 flex-1 space-y-4 p-0 2xl:p-8'>
      <div className='flex items-center justify-between space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>Accounting</h2>
      </div>
      <AccountingSummaryDashboard />
    </div>
  );
}
