"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  deleteAction: (formData: FormData) => Promise<any>;
  syncAction: (formData: FormData) => Promise<any>;
  connectionId: string;
};

export default function ConnectionActions({ deleteAction, syncAction, connectionId }: Props) {
  const confirmAndSubmit = (e: React.FormEvent, message = "Are you sure?") => {
    if (!confirm(message)) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <form action={syncAction} onSubmit={(e) => confirmAndSubmit(e, "Trigger sync for this sheet?")}> 
        <input type="hidden" name="connectionId" value={connectionId} />
        <Button type="submit" variant="outline" size="sm">Sync</Button>
      </form>
      <form action={deleteAction} onSubmit={(e) => confirmAndSubmit(e, "Delete this connection? This cannot be undone.")}> 
        <input type="hidden" name="connectionId" value={connectionId} />
        <Button type="submit" variant="destructive" size="sm">Delete</Button>
      </form>
    </div>
  );
}
