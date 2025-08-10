"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Cable,
  CheckCircle,
  Lightbulb,
  ShieldCheck,
  Zap,
  Users,
  Briefcase,
  BookOpen,
  ArrowRight,
  Menu,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleAuthRedirect = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Services", href: "#services" },
    { name: "Our Vision", href: "#vision" },
    { name: "Careers", href: "/job-listings" },
    { name: "Articles", href: "/articles" },
    { name: "Insights", href: "/insights" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Image src="/placeholder-logo.svg" alt="NNS Enterprise Logo" width={32} height={32} />
            NNS Enterprise
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium hover:text-blue-600 transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <Button onClick={handleAuthRedirect} disabled={loading} className="ml-4">
              {loading ? "Loading..." : user ? "Go to Dashboard" : "Sign In"}
            </Button>
          </nav>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle mobile menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs bg-white p-6">
              <div className="flex flex-col items-start space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-lg font-medium hover:text-blue-600 transition-colors w-full py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <Button onClick={handleAuthRedirect} disabled={loading} className="w-full mt-4">
                  {loading ? "Loading..." : user ? "Go to Dashboard" : "Sign In"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-[calc(100vh-64px)] flex items-center justify-center text-center px-4 py-12 md:py-24 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/placeholder.jpg?height=1080&width=1920&query=fiber optic network background"
              alt="Fiber Optic Network"
              fill
              style={{ objectFit: "cover" }}
              className="opacity-30"
            />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-gray-900 drop-shadow-lg">
              Pioneering FTTH Infrastructure
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
              Your trusted partner in seamless Fiber-to-the-Home (FTTH) establishment. We build the future of
              connectivity.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 rounded-full shadow-lg"
                onClick={() => router.push("#services")}
              >
                Our Services
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-lg px-8 py-3 rounded-full shadow-lg bg-transparent"
                onClick={handleAuthRedirect}
                disabled={loading}
              >
                {loading ? "Loading..." : user ? "Go to Dashboard" : "Partner Login"}
              </Button>
            </div>
          </div>
        </section>

        {/* Our Services: FTTH Establishment Process */}
        <section id="services" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our FTTH Establishment Process</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
              We ensure robust and reliable fiber optic deployments through a meticulous, end-to-end process.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Lightbulb,
                  title: "1. Planning & Design",
                  description: "Strategic network planning and detailed fiber optic route design for optimal coverage.",
                },
                {
                  icon: Cable,
                  title: "2. Infrastructure Deployment",
                  description:
                    "Efficient and precise installation of fiber cables, conduits, and passive optical networks.",
                },
                {
                  icon: ShieldCheck,
                  title: "3. Splicing & Termination",
                  description:
                    "Expert fiber splicing and termination to ensure minimal signal loss and maximum performance.",
                },
                {
                  icon: Zap,
                  title: "4. Testing & Commissioning",
                  description: "Rigorous testing and validation of the entire FTTH network for reliability and speed.",
                },
                {
                  icon: CheckCircle,
                  title: "5. Quality Assurance",
                  description:
                    "Comprehensive quality checks at every stage to meet industry standards and client expectations.",
                },
                {
                  icon: BookOpen,
                  title: "6. Documentation & Handover",
                  description:
                    "Detailed documentation and smooth handover, ensuring seamless integration for our partners.",
                },
              ].map((service, index) => (
                <Card key={index} className="p-6 text-left shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <service.icon className="h-10 w-10 text-blue-600" />
                    <CardTitle className="text-xl font-semibold text-gray-800">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Partner with NNS Enterprise? */}
        <section className="py-16 md:py-24 bg-blue-600 text-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-4xl font-bold mb-4">Why Partner with NNS Enterprise?</h2>
            <p className="text-lg max-w-3xl mx-auto mb-12 opacity-90">
              We are committed to delivering excellence and fostering strong, reliable partnerships.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Users,
                  title: "Reliable Partnership",
                  description:
                    "We act as a seamless extension of your team, ensuring clear communication and collaborative success.",
                },
                {
                  icon: Zap,
                  title: "Efficiency & Speed",
                  description:
                    "Our streamlined processes and experienced teams ensure rapid and effective project completion.",
                },
                {
                  icon: ShieldCheck,
                  title: "Uncompromising Quality",
                  description:
                    "Adhering to the highest industry standards, we guarantee robust and future-proof FTTH networks.",
                },
              ].map((reason, index) => (
                <Card
                  key={index}
                  className="p-6 bg-white text-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <CardHeader className="flex flex-col items-center pb-4">
                    <reason.icon className="h-12 w-12 text-blue-600 mb-4" />
                    <CardTitle className="text-xl font-semibold">{reason.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{reason.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Our Future Vision Section */}
        <section id="vision" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Future Vision: Expanding Horizons</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
              While FTTH establishment is our core, we are strategically expanding our service portfolio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Briefcase,
                  title: "Repair & Maintenance Contracts",
                  description:
                    "Seeking long-term partnerships for comprehensive network upkeep and rapid incident response.",
                },
                {
                  icon: Cable,
                  title: "Network Optimization Services",
                  description: "Offering advanced solutions for enhancing existing network performance and efficiency.",
                },
                {
                  icon: Lightbulb,
                  title: "Advanced Technical Services",
                  description: "Venturing into specialized technical consulting and bespoke telecom solutions.",
                },
              ].map((vision, index) => (
                <Card key={index} className="p-6 text-left shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <vision.icon className="h-10 w-10 text-blue-600" />
                    <CardTitle className="text-xl font-semibold text-gray-800">{vision.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{vision.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-12">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 rounded-full shadow-lg"
                onClick={() => router.push("/contact")}
              >
                Discuss Partnership Opportunities <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Call to Action for Public Content */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore More</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
              Stay updated with our latest job openings, industry articles, and expert insights.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <Briefcase className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-semibold text-gray-800">Careers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">Discover exciting opportunities to join our growing team.</p>
                  <Link href="/job-listings" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                    >
                      View Job Openings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <BookOpen className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-semibold text-gray-800">Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">Read our in-depth articles on telecom technology and trends.</p>
                  <Link href="/articles" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
                    >
                      Read Articles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <Lightbulb className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-semibold text-gray-800">Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">Gain valuable insights from our expert blog posts.</p>
                  <Link href="/insights" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                    >
                      Explore Insights
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">NNS Enterprise</h3>
            <p className="text-gray-400 text-sm">
              Your trusted partner in Fiber-to-the-Home (FTTH) infrastructure and beyond. Building the future of
              connectivity.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#services" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="#vision" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Future Vision
                </Link>
              </li>
              <li>
                <Link href="/job-listings" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/articles" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/insights" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Insights
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <p className="text-gray-400 text-sm">
              123 Telecom Way, Fiber City, FC 12345
              <br />
              Email: info@nnsenterprise.com
              <br />
              Phone: +1 (555) 123-4567
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                {/* Placeholder for social media icons */}
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V22H12c5.523 0 10-4.477 10-10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c-1.094.306-2.27.46-3.47.46-2.07 0-4.01-.79-5.48-2.26C-.01 17.25 0 15.25 0 13.18V12c0-1.09.2-2.15.58-3.15.38-1 .9-1.9 1.56-2.7.66-.8 1.4-1.4 2.26-1.9.86-.5 1.78-.8 2.76-.9.98-.1 1.96-.1 2.94 0 .98.1 1.96.3 2.94.6.98.3 1.9.7 2.76 1.2.86.5 1.6 1.1 2.26 1.9.66.8 1.18 1.7 1.56 2.7.38 1 .58 2.06.58 3.15v.82c0 2.07-.79 4.01-2.26 5.48-1.47 1.47-3.41 2.26-5.48 2.26-1.2 0-2.37-.15-3.47-.46zM12 2.5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 text-center text-gray-500 text-sm mt-8 border-t border-gray-700 pt-8">
          &copy; {new Date().getFullYear()} NNS Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
