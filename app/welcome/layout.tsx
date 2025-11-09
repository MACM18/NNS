import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";

export const metadata: Metadata = {
  title: {
    default: "NNS Enterprise - Telecom Solutions",
    template: "%s | NNS Enterprise",
  },
  description:
    "Leading telecom solutions provider specializing in fiber optic infrastructure, FTTH establishment, and comprehensive telecom services.",
  keywords: [
    "telecom",
    "fiber optic",
    "FTTH",
    "telecom infrastructure",
    "fiber network",
    "telecom services",
    "Sri Lanka telecom",
  ],
  openGraph: {
    title: "NNS Enterprise - Telecom Solutions",
    description:
      "Leading telecom solutions provider specializing in fiber optic infrastructure and FTTH establishment.",
    type: "website",
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
