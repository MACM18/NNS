"use client";

import React, { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TestTube, CheckCircle, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { testGoogleCredentials } from "../actions";

type TestResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export default function TestCredentialsForm() {
  const [accessToken, setAccessToken] = React.useState("");
  const { addNotification } = useNotification();
  const testFormRef = React.useRef<HTMLFormElement | null>(null);

  React.useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setAccessToken(data.session?.access_token ?? "");
      } catch {
        if (!cancelled) setAccessToken("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [testResult, testFormAction, testPending] = useActionState(
    testGoogleCredentials as any,
    null as TestResult | null
  );

  React.useEffect(() => {
    if (!testResult) return;
    if (testResult.success) {
      addNotification({
        title: "Credentials Test Passed",
        message: testResult.message || "Credentials are valid",
        type: "success",
        category: "system",
      });
    } else if (testResult.error) {
      addNotification({
        title: "Credentials Test Failed",
        message: String(testResult.error),
        type: "error",
        category: "system",
      });
    }
  }, [testResult, addNotification]);

  return (
    <div className='space-y-4'>
      <form action={testFormAction} ref={testFormRef}>
        <input type='hidden' name='sb_access_token' value={accessToken} />
        <Button
          type='submit'
          variant='outline'
          disabled={!accessToken || testPending}
          className='gap-2'
        >
          <TestTube className='h-4 w-4' />
          {testPending ? "Testing..." : "Test Credentials"}
        </Button>
      </form>

      {testResult && (
        <div
          className={`p-4 rounded-lg border ${
            testResult.success
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className='flex items-center gap-2'>
            {testResult.success ? (
              <CheckCircle className='h-5 w-5' />
            ) : (
              <XCircle className='h-5 w-5' />
            )}
            <span className='font-medium'>
              {testResult.success ? "Success" : "Error"}
            </span>
          </div>
          <p className='mt-1 text-sm'>
            {testResult.success
              ? testResult.message || "Credentials are valid"
              : testResult.error}
          </p>
        </div>
      )}
    </div>
  );
}
