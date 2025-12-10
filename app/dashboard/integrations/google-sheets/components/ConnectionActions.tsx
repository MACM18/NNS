"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
  const { addNotification } = useNotification();
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const router = useRouter();

  const triggerDelete = async () => {
    setDeletePending(true);
    try {
      const res = await fetch("/api/integrations/google-sheets/connection", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error("Sign in required to delete this connection.");
      }
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

  const handleSyncComplete = () => {
    // Refresh the page to show updated connection data
    router.refresh();
  };

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2'>
      {/* New sync with background job + progress + toasts */}
      <SyncSheetButton
        connectionId={connectionId}
        onSyncComplete={handleSyncComplete}
      />

      <Button
        type='button'
        variant='destructive'
        size='sm'
        onClick={() => setOpenDelete(true)}
        className='w-full sm:w-auto'
      >
        Delete
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
