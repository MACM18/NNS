import { Cable, Wrench, Network, Lightbulb, CheckCircle, FileText, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ServicesPage() {
  return (
    <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Our Comprehensive Services
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            From initial fiber optic deployment to ongoing maintenance and advanced solutions, we cover all your
            telecom infrastructure needs.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Fiber Optic Network Establishment</h2>
            <p className="text-muted-foreground leading-relaxed">
              As a leading subcontractor, our core expertise lies in the meticulous planning, design, and deployment
              of Fiber to the Home (FTTH) infrastructure. We ensure high-speed, reliable connectivity is delivered
              with precision and adherence to the highest industry standards. Our process includes:
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Lightbulb className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Planning & Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Detailed site surveys and network architecture planning for optimal deployment.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Cable className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Cable Laying & Splicing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Careful installation and precise termination for robust connections.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Testing & Commissioning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Rigorous verification of network integrity and performance.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Documentation & Handover</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive records for future maintenance and clarity.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Future & Advanced Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Building on our foundation, we are actively expanding our service portfolio to provide end-to-end
              telecom solutions, ensuring your infrastructure remains cutting-edge and fully operational.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Wrench className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Repair & Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Proactive and reactive services to ensure continuous optimal performance of fiber networks.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Network className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Network Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enhancing existing infrastructure for improved speed, reliability, and scalability.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Settings className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">Specialized Technical Consulting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Expert guidance and custom solutions for complex telecom challenges.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
