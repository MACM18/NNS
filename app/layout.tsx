import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { DataCacheProvider } from "@/contexts/data-cache-context";
import { Toaster } from "sonner";
import { ConsentAwareSpeedInsights } from "@/components/public/consent-aware-speed-insights";

export const metadata: Metadata = {
  title: {
    default: "NNS Enterprise",
    template: "%s | NNS Enterprise",
  },
  description:
    "AI-powered telecom management platform for fiber optic operations.",
  applicationName: "NNS Enterprise",
  generator: "Next.js",
  manifest: "/manifest.webmanifest",
  keywords: [
    "telecom",
    "fiber optic",
    "inventory management",
    "task management",
    "NNS",
    "telecommunications",
  ],
  authors: [{ name: "NNS Enterprise" }],
  creator: "NNS Enterprise",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NNS Telecom",
    startupImage: [
      {
        url: "/nns-enterprise-icon-512.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "NNS Enterprise",
    title: "NNS Enterprise",
    description: "AI-powered telecom management platform",
  },
  twitter: {
    card: "summary",
    title: "NNS Enterprise",
    description: "AI-powered telecom management platform",
  },
  icons: {
    icon: [
      { url: "/nns-enterprise-icon-180.png", type: "image/png", sizes: "180x180" },
      { url: "/nns-enterprise-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/nns-enterprise-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='min-h-screen bg-background font-sans antialiased'>
        <ConsentAwareSpeedInsights />
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            <AuthProvider>
              <NotificationProvider>
                <DataCacheProvider>
                  {children}
                  <Toaster />
                </DataCacheProvider>
              </NotificationProvider>
            </AuthProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
