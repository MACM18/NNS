import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircleIcon, UsersIcon, AwardIcon } from "lucide-react"

export default function WhyUsPage() {
  const reasons = [
    {
      icon: CheckCircleIcon,
      title: "Unmatched Reliability",
      description: "Experience consistent, high-performance service with minimal downtime.",
    },
    {
      icon: UsersIcon,
      title: "Customer-Centric Approach",
      description: "Your satisfaction is our priority. We offer personalized support and solutions.",
    },
    {
      icon: AwardIcon,
      title: "Award-Winning Innovation",
      description: "Stay ahead with our cutting-edge technology and innovative service offerings.",
    },
  ]

  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Why Choose Us?</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover the advantages of partnering with a leader in telecommunications.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <Card key={index} className="flex flex-col items-center text-center p-6">
              <CardHeader>
                <reason.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-xl font-semibold">{reason.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{reason.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">What Our Clients Say</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="p-6">
              <CardContent className="text-lg italic text-muted-foreground">
                &quot;Their service is incredibly reliable, and their support team is always there when we need them.
                Highly recommended!&quot;
              </CardContent>
              <p className="mt-4 font-semibold">- Jane Doe, CEO of TechCorp</p>
            </Card>
            <Card className="p-6">
              <CardContent className="text-lg italic text-muted-foreground">
                &quot;Switching to their solutions was the best decision for our business. Seamless transition and
                superior performance.&quot;
              </CardContent>
              <p className="mt-4 font-semibold">- John Smith, Operations Manager at Global Innovations</p>
            </Card>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
