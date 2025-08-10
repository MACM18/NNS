import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PhoneIcon, MailIcon, MapPinIcon } from "lucide-react"

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in Touch</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;d love to hear from you. Reach out to us through any of the methods below.
          </p>
        </section>

        <div className="grid gap-12 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold mb-4">Send Us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your Name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Subject of your inquiry" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Your message..." className="min-h-[120px]" />
                </div>
                <Button type="submit" className="w-full">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-8">
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold mb-4">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">Phone</h3>
                    <p className="text-muted-foreground">+1 (123) 456-7890</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MailIcon className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p className="text-muted-foreground">info@example.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">Address</h3>
                    <p className="text-muted-foreground">123 Main St, Anytown, USA 12345</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold mb-4">Our Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  {/* Placeholder for a map */}
                  Map Placeholder
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
