import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { DataCacheProvider } from "@/contexts/data-cache-context";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "NNS Telecom Dashboard",
  description: "Telecom Management System",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body>
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
              </DataCacheProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
