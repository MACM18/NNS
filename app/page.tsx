"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  ArrowRight,
  Award,
  Cable,
  CheckCircle,
  Lightbulb,
  Handshake,
  Zap,
  Settings,
  FileText,
  HardHat,
  Wrench,
  Network,
  TrendingUp,
  PhoneCall,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicLayout } from "@/components/layout/public-layout" // Import the new PublicLayout

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  return (
    <PublicLayout>
      {" "}
      {/* Wrap content with PublicLayout */}
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-24 sm:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              FTTH Infrastructure Specialists
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Your Trusted Partner for{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Fiber Optic Network Establishment
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              As a dedicated subcontractor, NNS Enterprise specializes in the precise and efficient deployment of Fiber
              to the Home (FTTH) infrastructure, ensuring seamless connectivity for your projects.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" className="text-base" onClick={handleAuthAction}>
                {user ? "Access Dashboard" : "Explore Our Services"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" asChild className="text-base bg-transparent">
                <Link href="/welcome/contact">Request a Proposal</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Our Services: FTTH Establishment Process */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our FTTH Establishment Process
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We follow a meticulous approach to ensure every fiber optic deployment is executed with precision and
              adherence to the highest industry standards.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Lightbulb className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">1. Planning & Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Detailed site surveys, network architecture planning, and route design for optimal fiber deployment.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <HardHat className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">2. Civil Works & Ducting</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Efficient trenching, duct laying, and infrastructure preparation with minimal disruption.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Cable className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">3. Fiber Optic Cable Laying</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Careful installation of fiber optic cables, ensuring protection and longevity.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">4. Splicing & Termination</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Expert fiber splicing and precise termination for robust and high-performance connections.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <CheckCircle className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">5. Testing & Commissioning</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Rigorous testing to verify network integrity, performance, and compliance with specifications.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">6. Documentation & Handover</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Comprehensive documentation and smooth handover, ensuring clarity for future maintenance.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Why Partner With Us Section */}
      <section id="why-partner" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Why Partner with NNS Enterprise?
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              We are more than just a subcontractor; we are an extension of your team, committed to your project's
              success.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <Handshake className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Reliable Partnership</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    We integrate seamlessly with your operations, providing dependable support and consistent
                    communication.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Efficiency & Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Our streamlined processes and experienced teams ensure rapid deployment without compromising
                    quality.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <Award className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Uncompromising Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Adherence to international standards and rigorous testing guarantee robust and future-proof fiber
                    networks.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Our Future Vision Section */}
      <section
        id="future-vision"
        className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-24 sm:py-32"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Expanding Our Horizons
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Beyond Establishment: Our Vision for Comprehensive Telecom Services
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              While FTTH establishment is our core, we are actively expanding our capabilities to offer a wider array of
              technical services, including repair, maintenance, and advanced network solutions.
            </p>
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                      <Wrench className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">Repair & Maintenance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Proactive and reactive services to ensure the continuous optimal performance of fiber networks.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                      <Network className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">Network Optimization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Enhancing existing infrastructure for improved speed, reliability, and future scalability.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                      <Settings className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">Advanced Technical Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Specialized technical consulting and custom solutions for complex telecom challenges.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Partner for Seamless Connectivity?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Let's discuss how NNS Enterprise can support your next fiber optic project or future technical needs.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="secondary" onClick={handleAuthAction}>
                {user ? "Go to Dashboard" : "Request a Proposal"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
              >
                <Link href="/welcome/contact">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Contact Sales
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
