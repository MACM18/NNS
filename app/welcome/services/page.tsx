import {
  Cable,
  Wrench,
  Network,
  Lightbulb,
  CheckCircle,
  FileText,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ServicesPage() {
  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          Our Expertise
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          Comprehensive Services
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          From initial fiber optic deployment to ongoing maintenance and advanced solutions, we cover all your telecom infrastructure needs.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-12 lg:grid-cols-2 lg:gap-24 items-start'>

          {/* Fiber Optic Establishment */}
          <div className='space-y-8 animate-fade-in-up'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-primary/20 transition-colors duration-500"></div>

              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-4 relative z-10'>
                Fiber Optic Network Establishment
              </h2>
              <p className='text-muted-foreground leading-relaxed mb-8 relative z-10'>
                We ensure high-speed, reliable connectivity with precision deployment. Our core expertise in FTTH infrastructure is unmatched.
              </p>

              <div className='grid gap-4 sm:grid-cols-2 relative z-10'>
                <div className="bg-background/50 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-colors">
                  <Lightbulb className='h-8 w-8 text-primary mb-3' />
                  <h3 className='font-semibold mb-1'>Planning & Design</h3>
                  <p className='text-xs text-muted-foreground'>Detailed site surveys & architecture.</p>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-colors">
                  <Cable className='h-8 w-8 text-primary mb-3' />
                  <h3 className='font-semibold mb-1'>Cable Laying</h3>
                  <p className='text-xs text-muted-foreground'>Precise installation & termination.</p>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-colors">
                  <CheckCircle className='h-8 w-8 text-primary mb-3' />
                  <h3 className='font-semibold mb-1'>Testing</h3>
                  <p className='text-xs text-muted-foreground'>Rigorous verification & commissioning.</p>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-colors">
                  <FileText className='h-8 w-8 text-primary mb-3' />
                  <h3 className='font-semibold mb-1'>Documentation</h3>
                  <p className='text-xs text-muted-foreground'>Comprehensive records & handover.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Future Services */}
          <div className='space-y-8 animate-fade-in-up animation-delay-200'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-accent/20 transition-colors duration-500"></div>

              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-4 relative z-10'>
                Future & Advanced Services
              </h2>
              <p className='text-muted-foreground leading-relaxed mb-8 relative z-10'>
                We are actively expanding our portfolio to provide end-to-end telecom solutions, ensuring your infrastructure remains cutting-edge.
              </p>

              <div className='space-y-4 relative z-10'>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Wrench className='h-5 w-5 text-accent' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>Repair & Maintenance</h3>
                    <p className='text-sm text-muted-foreground mt-1'>Proactive services to ensure continuous optimal performance.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Network className='h-5 w-5 text-accent' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>Network Optimization</h3>
                    <p className='text-sm text-muted-foreground mt-1'>Enhancing speed, reliability, and scalability of existing networks.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Settings className='h-5 w-5 text-accent' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>Technical Consulting</h3>
                    <p className='text-sm text-muted-foreground mt-1'>Expert guidance for complex telecom challenges.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <Button asChild className="w-full glass-button group-hover:bg-primary/90">
                  <Link href="/welcome/contact">
                    Request a Service Consultation <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
