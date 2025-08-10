import Link from "next/link"
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { CheckCircleIcon, LightbulbIcon, UsersIcon } from "lucide-react"

export default function LandingPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_550px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Revolutionizing Connectivity with NNS Enterprise
                  </h1>
                  <p className="max-w-[600px] text-gray-200 md:text-xl">
                    Delivering cutting-edge fiber optic solutions and unparalleled telecom services for a connected
                    future.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    href="/welcome/contact"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-blue-600 shadow transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Get a Quote
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-white bg-transparent px-8 text-sm font-medium shadow-sm transition-colors hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              <img
                src="/placeholder.svg?height=400&width=550"
                width="550"
                height="400"
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>

        <section id="services" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Services</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We offer a comprehensive suite of telecom solutions tailored to your needs.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="flex flex-col items-center p-6 text-center">
                <LightbulbIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Fiber Optic Installation</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  High-speed, reliable fiber optic network deployment for homes and businesses.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <UsersIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Managed Network Services</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Proactive monitoring, maintenance, and support for your network infrastructure.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <CheckCircleIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Custom Telecom Solutions</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Tailored solutions to meet unique communication requirements for various industries.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="why-us" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose NNS Enterprise?</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Experience the difference with our commitment to excellence and innovation.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <ul className="grid gap-6">
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Unmatched Reliability</h3>
                      <p className="text-muted-foreground">
                        Our robust infrastructure ensures consistent and uninterrupted service.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Expert Support</h3>
                      <p className="text-muted-foreground">
                        Our team of certified professionals is available 24/7 to assist you.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Innovative Solutions</h3>
                      <p className="text-muted-foreground">
                        We leverage the latest technology to provide future-proof telecom solutions.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <img
                src="/placeholder.svg?height=400&width=550"
                width="550"
                height="400"
                alt="Why Us"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full"
              />
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to Connect?</h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
              Contact us today to discuss your telecom needs and get a personalized quote.
            </p>
            <div className="mt-8">
              <Link
                href="/welcome/contact"
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-950 disabled:pointer-events-none disabled:opacity-50"
                prefetch={false}
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
