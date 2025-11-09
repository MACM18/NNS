import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { DataCacheProvider } from "@/contexts/data-cache-context";
import { Toaster } from "@/components/ui/toaster";
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
  generator: "v0.dev",
  manifest: "/manifest.webmanifest",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NNS Telecom Dashboard",
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
          <AuthProvider>
            <NotificationProvider>
              <DataCacheProvider>
                {children}
                <Toaster />
                <PWAInitializer />
              </DataCacheProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
