import AddConnectionForm from "./AddConnectionForm";
import { createConnectionFromForm } from "@/app/dashboard/integrations/google-sheets/actions";

export default function AddConnectionPage() {
  return (
    <div className='container mx-auto p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Add Google Sheet Connection</h1>
        <p className='text-muted-foreground mt-2'>
          Link a Google Sheet to a specific month for syncing.
        </p>
      </div>
      <AddConnectionForm action={createConnectionFromForm} />
    </div>
  );
}
