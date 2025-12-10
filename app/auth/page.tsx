import { AuthWrapper } from "@/components/auth/auth-wrapper";

// Disable static generation for this page since it uses client-side auth
export const dynamic = "force-dynamic";

export default function AuthPage() {
  return <AuthWrapper />;
}
