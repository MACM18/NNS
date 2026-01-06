import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountsTable } from "@/components/accounting";

export const metadata: Metadata = {
  title: "Chart of Accounts | NNS",
  description: "Manage your chart of accounts",
};

export default async function AccountsPage() {
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chart of Accounts</h2>
          <p className="text-muted-foreground">
            Manage your accounting structure and accounts
          </p>
        </div>
      </div>
      <AccountsTable />
    </div>
  );
}
