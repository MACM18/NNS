"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AccountLedger } from "@/components/accounting";

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <AccountLedger
        accountId={accountId}
        onBack={() => router.push("/dashboard/accounting/accounts")}
      />
    </div>
  );
}
