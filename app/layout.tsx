import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { DataCacheProvider } from "@/contexts/data-cache-context";
import { Toaster } from "@/components/ui/sonner";
import { PWAInitializer } from "@/components/pwa/pwa-initializer";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "NNS Telecom Dashboard",
    template: "%s | NNS Telecom",
  },
  description:
    "AI-powered telecom management platform for fiber optic operations.",
  applicationName: "NNS Telecom Dashboard",
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
  authors: [{ name: "NNS Telecom" }],
  creator: "NNS Telecom",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NNS Telecom",
    startupImage: [
      {
        url: "/placeholder-logo.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "NNS Telecom Dashboard",
    title: "NNS Telecom Dashboard",
    description: "AI-powered telecom management platform",
  },
  twitter: {
    card: "summary",
    title: "NNS Telecom Dashboard",
    description: "AI-powered telecom management platform",
  },
  icons: {
    icon: [
      { url: "/placeholder-logo.png", type: "image/png", sizes: "192x192" },
      { url: "/placeholder-logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/placeholder-logo.png", type: "image/png", sizes: "192x192" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
        <SpeedInsights />
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
                  <PWAInitializer />
                </DataCacheProvider>
              </NotificationProvider>
            </AuthProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
