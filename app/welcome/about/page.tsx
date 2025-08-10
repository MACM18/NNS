import { PublicLayout } from "@/components/layout/public-layout"
import { Building2, Lightbulb, Users, Handshake } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutUsPage() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">About NNS Enterprise</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your trusted partner in building the future of connectivity.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed">
                NNS Enterprise began as a dedicated subcontractor specializing in Fiber to the Home (FTTH)
                infrastructure establishment. Our journey started with a clear vision: to provide precise, efficient,
                and high-quality fiber optic deployment services, laying the groundwork for seamless digital
                connectivity. We quickly established a reputation for reliability and excellence, becoming a trusted
                partner in the telecom industry.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Over the years, our expertise has grown, and so has our ambition. While FTTH establishment remains our
                core strength, we are actively expanding our capabilities to offer a wider array of technical services.
                This includes comprehensive repair and maintenance contracts, ensuring the longevity and optimal
                performance of fiber networks. We are also planning to diversify into more advanced technical services,
                aiming to become a full-spectrum telecom solutions provider.
              </p>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Our Mission & Values</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our mission is to empower communities and businesses with robust and future-proof connectivity. We are
                driven by a set of core values that guide every aspect of our work:
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Lightbulb className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">Innovation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Continuously seeking new technologies and methods to deliver superior solutions.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Users className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">Collaboration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Working closely with partners and clients to achieve shared success.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Handshake className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">Integrity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Upholding the highest ethical standards in all our operations.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">Excellence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Committing to the highest quality in every project we undertake.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
