import React from "react";
import { checkIntegrationEnv } from "../actions";

export default async function Page() {
  // This runs on the server and requires an authorized admin/moderator session.
  // It will call `checkIntegrationEnv` which enforces authorization.
  const info = await checkIntegrationEnv();

  return (
    <div className='p-6'>
      <h1 className='text-lg font-semibold'>Integration env diagnostic</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        This page is intended for admins to verify that the Google service
        account and Supabase environment variables are present and in an
        expected format. No secret values are displayed.
      </p>
      <pre className='mt-4 bg-slate-50 p-4 rounded-md overflow-auto'>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
