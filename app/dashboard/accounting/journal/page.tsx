import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { JournalEntryTable } from "@/components/accounting";

export const metadata: Metadata = {
  title: "Journal Entries | NNS",
  description: "Manage journal entries and transactions",
};

export default async function JournalEntriesPage() {
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
          <h2 className="text-3xl font-bold tracking-tight">Journal Entries</h2>
          <p className="text-muted-foreground">
            Create and manage accounting journal entries
          </p>
        </div>
      </div>
      <JournalEntryTable />
    </div>
  );
}
