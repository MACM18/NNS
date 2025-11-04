"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";

type Props = {
  deleteAction: (formData: FormData) => Promise<any>;
  syncAction: (formData: FormData) => Promise<any>;
  connectionId: string;
};

export default function ConnectionActions({
  deleteAction,
  syncAction,
  connectionId,
}: Props) {
  const [accessToken, setAccessToken] = React.useState("");
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
  const confirmAndSubmit = (e: React.FormEvent, message = "Are you sure?") => {
    if (!confirm(message)) {
      e.preventDefault();
    }
  };

  return (
    <div className='flex items-center justify-end gap-2'>
      <form
        action={syncAction}
        onSubmit={(e) => confirmAndSubmit(e, "Trigger sync for this sheet?")}
      >
        <input type='hidden' name='connectionId' value={connectionId} />
        <input type='hidden' name='sb_access_token' value={accessToken} />
        <Button type='submit' variant='outline' size='sm'>
          Sync
        </Button>
      </form>
      <form
        action={deleteAction}
        onSubmit={(e) =>
          confirmAndSubmit(e, "Delete this connection? This cannot be undone.")
        }
      >
        <input type='hidden' name='connectionId' value={connectionId} />
        <input type='hidden' name='sb_access_token' value={accessToken} />
        <Button type='submit' variant='destructive' size='sm'>
          Delete
        </Button>
      </form>
    </div>
  );
}
