import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, HardHat, Lightbulb, Wrench, TrendingUp, ShieldCheck } from "lucide-react"

export default async function LandingPage() {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const handleAuthRedirect = async () => {
    "use server"
    if (user) {
      redirect("/dashboard")
    } else {
      redirect("/login")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-50">
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between w-full sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">NNS Enterprise</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/job-listings"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Careers
          </Link>
          <Link href="/articles" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Articles
          </Link>
          <Link href="/insights" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Insights
          </Link>
          <form action={handleAuthRedirect}>
            <Button type="submit" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
              {user ? "Go to Dashboard" : "Sign In"}
            </Button>
          </form>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-800 dark:to-purple-900 text-white">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6 drop-shadow-lg">
              Your Trusted Partner in FTTH Establishment
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 opacity-90">
              Specializing in seamless Fiber-to-the-Home (FTTH) line establishment, we empower connectivity as a
              dedicated subcontractor.
            </p>
            <form action={handleAuthRedirect}>
              <Button
                type="submit"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105"
              >
                {user ? "Access Your Dashboard" : "Get Started Today"}
              </Button>
            </form>
          </div>
        </section>

        {/* Our Services: FTTH Establishment Process */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-50">
              Our FTTH Establishment Process
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <Lightbulb className="h-12 w-12 text-blue-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">1. Planning & Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Meticulous site assessment and network architecture planning for optimal fiber deployment.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <HardHat className="h-12 w-12 text-green-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">2. Infrastructure Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Efficient trenching, ducting, and pole installation to lay the groundwork for fiber.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <Wrench className="h-12 w-12 text-yellow-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">3. Fiber Optic Cabling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Precise pulling and blowing of fiber optic cables through established conduits.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-red-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">4. Splicing & Termination</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Expert fusion splicing and termination for robust, high-performance connections.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <ShieldCheck className="h-12 w-12 text-purple-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">5. Testing & Quality Assurance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Rigorous testing with OTDR and power meters to ensure network integrity and performance.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center">
                  <TrendingUp className="h-12 w-12 text-orange-500 mb-4" />
                  <CardTitle className="text-xl font-semibold">6. Documentation & Handover</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Comprehensive documentation and seamless handover for operational readiness.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Partner with NNS Enterprise? */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-50">
              Why Partner with NNS Enterprise?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    Reliable Partnership
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    We are a dependable subcontractor, committed to fulfilling our commitments and supporting your
                    project goals with unwavering dedication.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    Efficiency & Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Our streamlined processes and experienced teams ensure rapid deployment without compromising on
                    quality or safety standards.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    Uncompromising Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    We adhere to the highest industry standards, ensuring every FTTH line is established with precision
                    and built to last.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Future Vision Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50">
              Expanding Our Horizons
            </h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-12 text-gray-600 dark:text-gray-400">
              While currently focused on FTTH establishment, we are actively planning to broaden our service offerings
              and become a comprehensive technical solutions provider.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    Repair & Maintenance Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Soon, we will offer robust repair and maintenance services to ensure the longevity and optimal
                    performance of fiber networks.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    Network Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Future plans include advanced services for network analysis, optimization, and performance tuning.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    Advanced Technical Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    We aim to provide a wider variety of technical services, adapting to evolving industry needs and
                    technologies.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
        <p className="text-xs">&copy; 2024 NNS Enterprise. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/job-listings" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Careers
          </Link>
          <Link href="/articles" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Articles
          </Link>
          <Link href="/insights" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Insights
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  )
}
