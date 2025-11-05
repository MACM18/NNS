"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import SyncSheetButton from "@/components/integrations/SyncSheetButton";

type Props = {
  connectionId: string;
};

export default function ConnectionActions({ connectionId }: Props) {
  const [accessToken, setAccessToken] = React.useState("");
  const { addNotification } = useNotification();
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const router = useRouter();

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

  const requireAuthOrNotify = (cb: () => void) => {
    if (!accessToken) {
      addNotification({
        title: "Sign in required",
        message: "Please sign in to perform this action.",
        type: "error",
        category: "system",
      });
      return;
    }
    cb();
  };

  const triggerDelete = async () => {
    setDeletePending(true);
    try {
      const res = await fetch("/api/integrations/google-sheets/connection", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      addNotification({
        title: "Connection deleted",
        message: "The Google Sheet connection was removed.",
        type: "success",
        category: "system",
      });
      router.refresh();
    } catch (e: any) {
      addNotification({
        title: "Delete failed",
        message: e?.message || "Unknown error",
        type: "error",
        category: "system",
      });
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className='flex items-center justify-end gap-2'>
      {/* New sync with background job + progress + toasts */}
      <SyncSheetButton connectionId={connectionId} />

      <Button
        type='button'
        variant='destructive'
        size='sm'
        onClick={() => requireAuthOrNotify(() => setOpenDelete(true))}
        disabled={!accessToken}
        title={!accessToken ? "Sign in to delete" : undefined}
      >
        {accessToken ? "Delete" : "Sign in to delete"}
      </Button>

      {/* Delete confirmation dialog */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this connection?</DialogTitle>
            <DialogDescription>
              This can’t be undone. The connection record will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenDelete(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setOpenDelete(false);
                triggerDelete();
              }}
              disabled={deletePending}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
