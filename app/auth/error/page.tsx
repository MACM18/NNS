// app/auth/error/page.tsx
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const code = params?.error ?? "Unknown";
  const message =
    code === "AccessDenied"
      ? "You don't have permission to access this page. Please contact an administrator."
      : "Something went wrong during sign in.";

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <div className='max-w-md w-full space-y-4 text-center'>
        <h1 className='text-2xl font-bold'>Access denied</h1>
        <p className='text-sm text-muted-foreground'>{message}</p>
        <a href='/login' className='text-sm text-primary underline'>
          Back to login
        </a>
      </div>
    </div>
  );
}
