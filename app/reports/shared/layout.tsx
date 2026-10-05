import type { ReactNode } from "react";

export const metadata = {
  title: "Shared Monthly Reports | NNS",
  robots: { index: false, follow: false },
};

export default function SharedReportsLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh w-full overflow-hidden">{children}</div>;
}
