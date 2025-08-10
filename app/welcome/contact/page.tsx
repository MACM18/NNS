import { PublicLayout } from "@/components/layout/public-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MailIcon, PhoneIcon, MapPinIcon } from "lucide-react"

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Get in Touch</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Have questions or need support? Reach out to us, and we'll be happy to assist you.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Contact Information</h2>
                  <p className="text-muted-foreground">
                    Feel free to reach out to us through any of the following channels.
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <MailIcon className="h-6 w-6 text-blue-600" />
                    <span className="text-lg">info@nnsenterprise.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-6 w-6 text-blue-600" />
                    <span className="text-lg">+1 (123) 456-7890</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <span className="text-lg">
                      123 Telecom Way, Suite 100
                      <br />
                      Fiber City, FC 90210
                      <br />
                      USA
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-4">Send us a Message</h2>
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
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
