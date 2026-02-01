import {
  Handshake,
  TrendingUp,
  Award,
  ShieldCheck,
  Users,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WhyUsPage() {
  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          The NNS Advantage
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          Why Partner with NNS?
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          We are more than a subcontractor; we are an extension of your team, committed to precision, speed, and quality.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-12 lg:grid-cols-2 lg:gap-24 items-start'>

          {/* Core Strengths */}
          <div className='space-y-8 animate-fade-in-up'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-primary/20 transition-colors duration-500"></div>

              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-8 relative z-10'>
                Our Core Strengths
              </h2>

              <div className="grid gap-6 sm:grid-cols-2 relative z-10">
                <div className="p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Handshake className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='font-semibold mb-2'>Reliable Partnership</h3>
                  <p className='text-sm text-muted-foreground'>Seamless integration with your operations for dependable support.</p>
                </div>

                <div className="p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='font-semibold mb-2'>Efficiency & Speed</h3>
                  <p className='text-sm text-muted-foreground'>Streamlined processes ensuring rapid deployment.</p>
                </div>

                <div className="p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Award className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='font-semibold mb-2'>Quality First</h3>
                  <p className='text-sm text-muted-foreground'>Adherence to international standards and rigorous testing.</p>
                </div>

                <div className="p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <ShieldCheck className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='font-semibold mb-2'>Safety Priority</h3>
                  <p className='text-sm text-muted-foreground'>Strict safety protocols for a secure working environment.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team & Approach */}
          <div className='space-y-8 animate-fade-in-up animation-delay-200'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-accent/20 transition-colors duration-500"></div>

              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-4 relative z-10'>
                Our Team & Approach
              </h2>
              <p className='text-muted-foreground leading-relaxed mb-8 relative z-10'>
                Our success is built on the expertise of our dedicated professionals and a collaborative approach that puts your project's needs at the forefront.
              </p>

              <div className='space-y-6 relative z-10'>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
                    <Users className='h-6 w-6 text-accent' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg'>Experienced Professionals</h3>
                    <p className='text-sm text-muted-foreground'>Certified technicians with years of field experience.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
                    <Rocket className='h-6 w-6 text-accent' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg'>Agile Project Management</h3>
                    <p className='text-sm text-muted-foreground'>Adaptive strategies to meet evolving timelines.</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 relative z-10">
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                  <h3 className="font-bold text-xl mb-2">Ready to work with us?</h3>
                  <p className="text-muted-foreground mb-6">Let's discuss how we can support your next project.</p>
                  <Button asChild size="lg" className="w-full sm:w-auto glass-button">
                    <Link href="/welcome/contact">
                      Get in Touch <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
