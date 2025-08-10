import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { UsersIcon, LightbulbIcon, AwardIcon } from "lucide-react"

export default function AboutUsPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">About NNS Enterprise</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Pioneering the future of connectivity with innovative telecom solutions.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <p className="text-lg text-muted-foreground">
                  NNS Enterprise is a leading provider of advanced fiber optic and telecommunication services. With a
                  legacy of innovation and a commitment to excellence, we empower businesses and communities with
                  reliable, high-speed connectivity solutions. Our mission is to bridge the digital divide and foster a
                  more connected world.
                </p>
                <p className="text-lg text-muted-foreground">
                  Founded on principles of integrity and customer-centricity, we pride ourselves on delivering tailored
                  solutions that meet the evolving demands of the modern digital landscape. From robust network
                  infrastructure to cutting-edge communication technologies, NNS Enterprise is your trusted partner for
                  all things telecom.
                </p>
              </div>
              <img
                src="/placeholder.svg?height=400&width=550"
                width="550"
                height="400"
                alt="About Us"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Values</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Guiding principles that define our work and commitment to our clients.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="flex flex-col items-center p-6 text-center">
                <UsersIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Customer Focus</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  We prioritize our clients' needs, delivering solutions that exceed expectations.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <LightbulbIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Innovation</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Continuously exploring new technologies to provide cutting-edge services.
                </CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <AwardIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl font-bold">Excellence</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">
                  Committed to the highest standards in every aspect of our operations.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
