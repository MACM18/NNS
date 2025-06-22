import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { ThemeProvider } from '@/components/theme-provider'

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}