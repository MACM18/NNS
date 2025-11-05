"use client";

import React, { useEffect, useActionState } from "react";
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
  const { addNotification } = useNotification();
  const syncFormRef = React.useRef<HTMLFormElement | null>(null);
  const deleteFormRef = React.useRef<HTMLFormElement | null>(null);
  const [openSync, setOpenSync] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
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

  // Use action state so we can show toasts based on server action results
  // @ts-ignore - useActionState typing in this project is flexible
  const [syncResult, syncFormAction, syncPending] = useActionState(
    syncAction as any,
    null
  );
  // @ts-ignore
  const [deleteResult, deleteFormAction, deletePending] = useActionState(
    deleteAction as any,
    null
  );

  // Notify when sync completes
  useEffect(() => {
    if (!syncResult) return;
    if ((syncResult as any).ok) {
      addNotification({
        title: "Sync completed",
        message: "Sheet rows were synced successfully.",
        type: "success",
        category: "system",
      });
    } else if ((syncResult as any).error) {
      addNotification({
        title: "Sync failed",
        message: String((syncResult as any).error),
        type: "error",
        category: "system",
      });
    }
  }, [syncResult, addNotification]);

  // Notify when delete completes
  useEffect(() => {
    if (!deleteResult) return;
    if ((deleteResult as any).ok) {
      addNotification({
        title: "Connection deleted",
        message: "The Google Sheet connection was removed.",
        type: "success",
        category: "system",
      });
    } else if ((deleteResult as any).error) {
      addNotification({
        title: "Delete failed",
        message: String((deleteResult as any).error),
        type: "error",
        category: "system",
      });
    }
  }, [deleteResult, addNotification]);

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

  return (
    <div className='flex items-center justify-end gap-2'>
      <form action={syncFormAction} ref={syncFormRef}>
        <input type='hidden' name='connectionId' value={connectionId} />
        <input type='hidden' name='sb_access_token' value={accessToken} />
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => requireAuthOrNotify(() => setOpenSync(true))}
          disabled={!accessToken}
          title={!accessToken ? "Sign in to sync" : undefined}
        >
          {accessToken ? "Sync" : "Sign in to sync"}
        </Button>
      </form>
      <form action={deleteFormAction} ref={deleteFormRef}>
        <input type='hidden' name='connectionId' value={connectionId} />
        <input type='hidden' name='sb_access_token' value={accessToken} />
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
      </form>

      {/* Sync confirmation dialog */}
      <Dialog open={openSync} onOpenChange={setOpenSync}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger sync?</DialogTitle>
            <DialogDescription>
              This will fetch the latest rows from the Google Sheet and update
              matching lines.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenSync(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpenSync(false);
                // Submit the form which points to the action returned by useActionState
                syncFormRef.current?.requestSubmit();
              }}
              disabled={syncPending}
            >
              {syncPending ? "Syncing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                deleteFormRef.current?.requestSubmit();
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
