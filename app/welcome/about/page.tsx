import { Building2, Lightbulb, Users, Handshake, Target, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutUsPage() {
  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          Our Identity
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          About NNS Enterprise
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          Your trusted partner in building the future of connectivity. We bridge the gap between innovation and infrastructure.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-12 lg:grid-cols-2 lg:gap-24 items-start'>

          {/* Our Story */}
          <div className='space-y-8 animate-fade-in-up'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <History className="h-6 w-6 text-primary" />
                </div>
                <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                  Our Story
                </h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  NNS Enterprise began as a dedicated subcontractor specializing
                  in Fiber to the Home (FTTH) infrastructure establishment. Our
                  journey started with a clear vision: to provide precise,
                  efficient, and high-quality fiber optic deployment services,
                  laying the groundwork for seamless digital connectivity.
                </p>
                <p>
                  Over the years, our expertise has grown, and so has our
                  ambition. While FTTH establishment remains our core strength, we
                  are actively expanding our capabilities to offer a wider array
                  of technical services, including comprehensive repair and
                  maintenance contracts.
                </p>
              </div>
            </div>
          </div>

          {/* Mission & Values */}
          <div className='space-y-8 animate-fade-in-up animation-delay-200'>
            <div className="glass-card p-8 rounded-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                  Our Mission
                </h2>
              </div>
              <p className='text-muted-foreground leading-relaxed mb-8'>
                To empower communities and businesses with robust and future-proof connectivity, driven by a commitment to excellence and innovation.
              </p>

              <h3 className="text-lg font-semibold mb-4">Core Values</h3>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/50">
                  <Lightbulb className='h-6 w-6 text-primary mb-3' />
                  <h4 className='font-semibold mb-1'>Innovation</h4>
                  <p className='text-xs text-muted-foreground'>Seeking new technologies to deliver superior solutions.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/50">
                  <Users className='h-6 w-6 text-primary mb-3' />
                  <h4 className='font-semibold mb-1'>Collaboration</h4>
                  <p className='text-xs text-muted-foreground'>Working closely with partners for shared success.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/50">
                  <Handshake className='h-6 w-6 text-primary mb-3' />
                  <h4 className='font-semibold mb-1'>Integrity</h4>
                  <p className='text-xs text-muted-foreground'>Upholding the highest ethical standards.</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/50">
                  <Building2 className='h-6 w-6 text-primary mb-3' />
                  <h4 className='font-semibold mb-1'>Excellence</h4>
                  <p className='text-xs text-muted-foreground'>Committing to the highest quality in every project.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
