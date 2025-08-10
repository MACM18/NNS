import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { AwardIcon, HandshakeIcon, LightbulbIcon, ShieldCheckIcon, UsersIcon } from "lucide-react"

export default function WhyUsPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose NNS Enterprise?</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Experience the difference with our commitment to excellence, innovation, and customer satisfaction.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <ul className="grid gap-6">
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheckIcon className="h-6 w-6 text-blue-600" /> Unmatched Reliability
                      </h3>
                      <p className="text-muted-foreground">
                        Our robust infrastructure and redundant systems ensure consistent and uninterrupted service,
                        keeping you connected when it matters most.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <UsersIcon className="h-6 w-6 text-blue-600" /> Expert Support
                      </h3>
                      <p className="text-muted-foreground">
                        Our team of highly skilled and certified professionals is available 24/7 to provide prompt and
                        effective support, ensuring your peace of mind.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <LightbulbIcon className="h-6 w-6 text-blue-600" /> Innovative Solutions
                      </h3>
                      <p className="text-muted-foreground">
                        We continuously invest in research and development to bring you the latest advancements in
                        telecom technology, future-proofing your connectivity.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <HandshakeIcon className="h-6 w-6 text-blue-600" /> Tailored Partnerships
                      </h3>
                      <p className="text-muted-foreground">
                        We work closely with each client to understand their unique needs and deliver customized
                        solutions that drive their success.
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
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Achievements</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Proudly recognized for our contributions to the telecom industry.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="flex flex-col items-center p-6 text-center">
                <AwardIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-4xl font-bold">99.9%</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">Uptime Guarantee</CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <UsersIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-4xl font-bold">10,000+</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">Satisfied Clients</CardContent>
              </Card>
              <Card className="flex flex-col items-center p-6 text-center">
                <LightbulbIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-4xl font-bold">15+</CardTitle>
                <CardContent className="text-sm text-muted-foreground mt-2">Years of Innovation</CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
