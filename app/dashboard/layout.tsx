import type { ReactNode } from "react";

// Lightweight dashboard segment layout. We intentionally avoid wrapping
// sidebar/header here because individual pages currently render their own
// shell. This preserves behavior while aligning with Next.js segment layout structure.
export default function DashboardSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
