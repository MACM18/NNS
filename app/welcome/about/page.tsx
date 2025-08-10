import { PublicLayout } from "@/components/layout/public-layout"
import { Users, Lightbulb, Handshake } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutUsPage() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">About NNS Enterprise</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Learn about our mission, values, and the dedicated team behind our success in FTTH infrastructure.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Our Mission</h2>
                <p className="text-muted-foreground">
                  To be the leading subcontractor in Fiber to the Home (FTTH) infrastructure, delivering unparalleled
                  quality and efficiency, and fostering seamless connectivity for communities worldwide. We are
                  committed to innovation, reliability, and sustainable growth.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Our Vision</h2>
                <p className="text-muted-foreground">
                  To expand our expertise beyond FTTH establishment, becoming a comprehensive telecom services provider
                  known for advanced technical solutions, proactive maintenance, and unwavering client partnerships.
                </p>
              </div>
            </div>
            <div className="grid gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center space-x-4">
                  <Users className="h-8 w-8 text-primary" />
                  <CardTitle>Our Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Comprised of highly skilled engineers, technicians, and project managers, our team is our greatest
                    asset. We work collaboratively to ensure every project is executed with precision and expertise.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center space-x-4">
                  <Lightbulb className="h-8 w-8 text-primary" />
                  <CardTitle>Innovation & Technology</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We embrace cutting-edge technology and innovative practices to deliver superior fiber optic
                    solutions, ensuring our networks are future-proof and high-performing.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center space-x-4">
                  <Handshake className="h-8 w-8 text-primary" />
                  <CardTitle>Client Partnership</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We believe in building strong, lasting relationships with our clients, acting as a trusted extension
                    of their team to achieve shared success.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
