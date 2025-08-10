import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { CableIcon, CloudIcon, HardDriveIcon, LightbulbIcon, NetworkIcon, PhoneIcon } from "lucide-react"

export default function ServicesPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Comprehensive Telecom Services</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Delivering cutting-edge solutions to power your connectivity needs.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="flex flex-col items-center p-6 text-center">
                <CableIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Fiber Optic Solutions</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  High-speed fiber optic network design, installation, and maintenance for unparalleled performance.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <NetworkIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Managed Network Services</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Proactive monitoring, security, and optimization to ensure your network runs smoothly 24/7.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <PhoneIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">VoIP & Unified Communications</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Modern voice and communication solutions for seamless collaboration and cost savings.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <CloudIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Cloud Connectivity</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Secure and efficient connections to public and private cloud environments.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <HardDriveIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Data Center Solutions</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Robust infrastructure and connectivity for your critical data center operations.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <LightbulbIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Consulting & Design</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Expert guidance and custom network design to meet your specific business requirements.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
