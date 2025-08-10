import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle,
  HardHat,
  Lightbulb,
  MapPin,
  FileText,
  Handshake,
  Zap,
  ShieldCheck,
  TrendingUp,
  Globe,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-50">
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm fixed top-0 z-50">
        <Link className="flex items-center justify-center" href="/">
          <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-8 w-auto" />
          <span className="sr-only">NNS Enterprise</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#services">
            Services
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#why-us">
            Why Us
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#future-vision">
            Future
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/job-listings">
            Careers
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/articles">
            Articles
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/insights">
            Insights
          </Link>
          <form action={handleAuthRedirect}>
            <Button type="submit" variant="ghost" className="text-sm font-medium">
              {user ? "Go to Dashboard" : "Sign In"}
            </Button>
          </form>
        </nav>
      </header>

      <main className="flex-1 pt-16">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 to-purple-700 text-white flex items-center justify-center text-center">
          <div className="container px-4 md:px-6 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 animate-fade-in-up">
              Your Trusted Partner in FTTH Infrastructure
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90 animate-fade-in-up delay-200">
              Specializing in seamless Fiber-to-the-Home (FTTH) line establishment for leading telecom providers.
            </p>
            <form action={handleAuthRedirect}>
              <Button
                type="submit"
                className="bg-white text-blue-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700 px-8 py-3 text-lg rounded-full shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in-up delay-400"
              >
                {user ? "Access Your Dashboard" : "Get Started"}
              </Button>
            </form>
          </div>
        </section>

        <section id="services" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-50">
              Our FTTH Establishment Process
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Lightbulb className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">1. Planning & Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Meticulous site surveys and network architecture planning to ensure optimal fiber deployment.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <MapPin className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">2. Route Mapping & Permitting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Precise route identification and efficient acquisition of all necessary permits.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <HardHat className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">3. Infrastructure Deployment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Expert trenching, duct laying, and pole installation for robust physical infrastructure.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Zap className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">4. Fiber Optic Cabling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Precision fiber pulling, splicing, and termination by certified technicians.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">5. Testing & Quality Assurance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Rigorous testing to ensure optimal signal strength, minimal loss, and network reliability.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <FileText className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">6. Documentation & Handover</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Comprehensive documentation and smooth handover to ensure seamless operation for our partners.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="why-us" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-50">
              Why Partner with NNS Enterprise?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Handshake className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Reliable Partnership</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    We are committed to building long-term relationships based on trust, transparency, and mutual
                    success.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Zap className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Efficiency & Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Our streamlined processes and experienced teams ensure rapid and efficient project completion.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <ShieldCheck className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Uncompromising Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    We adhere to the highest industry standards, delivering robust and future-proof fiber networks.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="future-vision" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-50">
              Our Future Vision: Expanding Horizons
            </h2>
            <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
              While we excel in FTTH establishment, we are actively expanding our capabilities to offer a broader
              spectrum of telecom services.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <TrendingUp className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Repair & Maintenance Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Ensuring the longevity and optimal performance of fiber networks through proactive and reactive
                    maintenance.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Lightbulb className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Network Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Advanced solutions for enhancing network efficiency, capacity, and overall performance.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Globe className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-xl font-semibold">Diverse Technical Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    Expanding into a wider variety of technical services to meet evolving industry demands.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 to-purple-700 text-white flex items-center justify-center text-center">
          <div className="container px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Build the Future Together?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Partner with NNS Enterprise for reliable, high-quality FTTH infrastructure and beyond.
            </p>
            <form action={handleAuthRedirect}>
              <Button
                type="submit"
                className="bg-white text-blue-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700 px-8 py-3 text-lg rounded-full shadow-lg transition-all duration-300 hover:scale-105"
              >
                {user ? "Go to Dashboard" : "Contact Us"}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 px-4 md:px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Link className="flex items-center" href="/">
              <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-8 w-auto mr-2" />
              <span className="text-xl font-bold text-white">NNS Enterprise</span>
            </Link>
            <p className="text-sm">
              Your trusted partner in Fiber-to-the-Home (FTTH) infrastructure and beyond. Building the future of
              connectivity, one fiber at a time.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <nav className="space-y-2 flex flex-col">
              <Link className="text-sm hover:text-white transition-colors" href="#services">
                Our Services
              </Link>
              <Link className="text-sm hover:text-white transition-colors" href="#why-us">
                Why Partner With Us
              </Link>
              <Link className="text-sm hover:text-white transition-colors" href="#future-vision">
                Future Vision
              </Link>
              <Link className="text-sm hover:text-white transition-colors" href="/job-listings">
                Careers
              </Link>
              <Link className="text-sm hover:text-white transition-colors" href="/articles">
                Articles
              </Link>
              <Link className="text-sm hover:text-white transition-colors" href="/insights">
                Insights
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact Us</h3>
            <p className="text-sm">
              123 Fiber Optic Way, Telecom City, TX 78901
              <br />
              Email: info@nnsenterprise.com
              <br />
              Phone: (123) 456-7890
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          &copy; {new Date().getFullYear()} NNS Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
