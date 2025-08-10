"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  CheckCircle,
  HardHat,
  Lightbulb,
  MapPin,
  Network,
  Rocket,
  ShieldCheck,
  GaugeIcon as Speedometer,
  Users,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"

export default function LandingPage() {
  const { user, loading } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/placeholder-logo.svg" alt="NNS Enterprise Logo" width={40} height={40} />
          <span className="text-2xl font-bold text-gray-900">NNS Enterprise</span>
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="#services" className="text-gray-600 hover:text-blue-600 transition-colors">
            Services
          </Link>
          <Link href="#why-us" className="text-gray-600 hover:text-blue-600 transition-colors">
            Why Us
          </Link>
          <Link href="#future-vision" className="text-gray-600 hover:text-blue-600 transition-colors">
            Future
          </Link>
          <Link href="/job-listings" className="text-gray-600 hover:text-blue-600 transition-colors">
            Careers
          </Link>
          <Link href="/articles" className="text-gray-600 hover:text-blue-600 transition-colors">
            Articles
          </Link>
          <Link href="/insights" className="text-gray-600 hover:text-blue-600 transition-colors">
            Insights
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          {!loading &&
            (user ? (
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 bg-transparent"
                >
                  Sign In
                </Button>
              </Link>
            ))}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full h-[600px] bg-gradient-to-r from-blue-600 to-purple-700 flex items-center justify-center text-center px-4 py-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Image
              src="/placeholder.svg?height=600&width=1200"
              alt="Abstract Fiber Optic Network"
              layout="fill"
              objectFit="cover"
              quality={100}
            />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-white">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 drop-shadow-lg">
              Your Trusted Partner in FTTH Network Establishment
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Specializing in efficient, high-quality Fiber-to-the-Home (FTTH) line deployment as a dedicated
              subcontractor.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="#services">
                <Button className="bg-white text-blue-700 hover:bg-gray-100 px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
                  Explore Our Services <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {!loading &&
                (user ? (
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-blue-700 px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-transparent"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-blue-700 px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-transparent"
                    >
                      Sign In
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* Our Services: FTTH Establishment Process */}
        <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Our FTTH Establishment Process</h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              We follow a meticulous, step-by-step approach to ensure seamless and reliable fiber optic network
              deployment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Lightbulb className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">1. Planning & Design</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Detailed site surveys, network architecture planning, and material estimation to lay the groundwork
                  for success.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <MapPin className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">2. Route Preparation</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Efficient trenching, duct laying, and pole attachment preparation, minimizing disruption and
                  maximizing safety.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Network className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">3. Fiber Laying & Splicing</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Precise fiber optic cable installation and expert fusion splicing for robust, high-performance
                  connections.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">4. Testing & Validation</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Rigorous testing using advanced equipment to ensure signal integrity, low loss, and network
                  reliability.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <HardHat className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">5. Installation & Activation</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Final connection of customer premises equipment (CPE) and activation of services, ensuring end-user
                  satisfaction.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Users className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">6. Documentation & Handover</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Comprehensive documentation of the deployed network and smooth handover to the primary contractor.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Partner with NNS Enterprise? */}
        <section id="why-us" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-100">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Why Partner with NNS Enterprise?</h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              We are committed to delivering excellence and building strong, reliable partnerships.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <ShieldCheck className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Reliable Partnership</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  We act as a seamless extension of your team, ensuring project continuity and consistent communication.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Speedometer className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Efficiency & Speed</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Our experienced teams and streamlined processes ensure rapid deployment without compromising quality.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Uncompromising Quality</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  We adhere to the highest industry standards, guaranteeing robust and future-proof fiber networks.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Future Vision Section */}
        <section id="future-vision" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Our Future Vision: Expanding Horizons</h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              While specializing in FTTH establishment, we are actively planning to broaden our service offerings.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Rocket className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Repair & Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Expanding into comprehensive repair and maintenance contracts to ensure long-term network reliability.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Network className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Network Optimization</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Offering advanced services for network performance analysis and optimization to maximize efficiency.
                </CardContent>
              </Card>
              <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center pb-4">
                  <Lightbulb className="h-12 w-12 text-purple-600 mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">Advanced Technical Services</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Venturing into a wider variety of technical services to meet evolving industry demands.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">NNS Enterprise</h3>
            <p className="text-gray-400">
              Your trusted partner in Fiber-to-the-Home (FTTH) network establishment and future-proof connectivity
              solutions.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#services" className="text-gray-400 hover:text-white transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="#why-us" className="text-gray-400 hover:text-white transition-colors">
                  Why Partner With Us
                </Link>
              </li>
              <li>
                <Link href="#future-vision" className="text-gray-400 hover:text-white transition-colors">
                  Future Vision
                </Link>
              </li>
              <li>
                <Link href="/job-listings" className="text-gray-400 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Content</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/articles" className="text-gray-400 hover:text-white transition-colors">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/insights" className="text-gray-400 hover:text-white transition-colors">
                  Insights
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <p className="text-gray-400">123 Fiber Optic Way, Tech City, TX 78701</p>
            <p className="text-gray-400">info@nnsenterprise.com</p>
            <p className="text-gray-400">+1 (555) 123-4567</p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500">
          &copy; {new Date().getFullYear()} NNS Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
