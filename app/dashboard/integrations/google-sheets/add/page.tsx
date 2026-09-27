import AddConnectionForm from "./AddConnectionForm";

export default function AddConnectionPage() {
  return (
    <div className='container mx-auto min-w-0 p-0 2xl:p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Add Google Sheet Connection</h1>
        <p className='text-muted-foreground mt-2'>
          Link a Google Sheet to a specific month for syncing.
        </p>
      </div>
      <AddConnectionForm />
    </div>
  );
}
