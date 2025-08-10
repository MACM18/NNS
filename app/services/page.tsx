import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GlobeIcon, ZapIcon, ShieldCheckIcon, HeadsetIcon } from "lucide-react"

export default function ServicesPage() {
  const services = [
    {
      icon: GlobeIcon,
      title: "High-Speed Internet",
      description: "Blazing fast and reliable internet connections for homes and businesses.",
    },
    {
      icon: ZapIcon,
      title: "Crystal Clear Voice",
      description: "Uninterrupted voice communication with advanced features and affordable plans.",
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure Data Solutions",
      description: "Robust data security and cloud storage options to protect your valuable information.",
    },
    {
      icon: HeadsetIcon,
      title: "24/7 Customer Support",
      description: "Dedicated support team available around the clock to assist you with any queries.",
    },
  ]

  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Services</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Providing cutting-edge telecommunication solutions tailored to your needs.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className="flex flex-col items-center text-center p-6">
              <CardHeader>
                <service.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-xl font-semibold">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </PublicLayout>
  )
}
