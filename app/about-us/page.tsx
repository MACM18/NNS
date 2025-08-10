import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function AboutUsPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About Our Company</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Dedicated to connecting communities through reliable and innovative telecommunication services.
          </p>
        </section>

        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Mission</h2>
            <p className="text-lg text-muted-foreground">
              Our mission is to empower individuals and businesses with seamless, high-speed connectivity and
              communication solutions that foster growth, innovation, and community engagement. We strive to be the most
              trusted and customer-centric telecommunications provider.
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Vision</h2>
            <p className="text-lg text-muted-foreground">
              To be the leading telecommunications company, recognized for our commitment to technological excellence,
              exceptional service, and positive impact on the lives of our customers and the communities we serve.
            </p>
          </div>
          <div className="relative h-96 w-full rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/placeholder.jpg?height=400&width=600&query=modern office building exterior"
              alt="Company Building"
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
            />
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl mb-12">Our Values</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We operate with honesty, transparency, and a strong moral compass in all our dealings.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We continuously seek new and better ways to deliver services and enhance customer experience.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Customer Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our customers are at the heart of everything we do. We listen, understand, and deliver.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We are committed to delivering the highest quality services and achieving outstanding results.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We believe in giving back and contributing positively to the communities we serve.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
