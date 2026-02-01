"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Settings,
  FileText,
  HardHat,
  Network,
  Users,
  Clock,
  MapPin,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className='relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background'>
        <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 animate-pulse-slow'></div>

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

        <div className='relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-8 max-w-5xl mx-auto'>
          <div className="animate-fade-in-up">
            <Badge variant="outline" className="px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary mb-6 backdrop-blur-sm">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Leading FTTH Infrastructure Partner
            </Badge>

            <h1 className='text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-tight'>
              Powering the Future of <br />
              <span className='text-gradient'>Connectivity</span>
            </h1>

            <p className='mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
              NNS Enterprise delivers precision-engineered Fiber to the Home infrastructure.
              We bridge the gap between innovation and implementation.
            </p>

            <div className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-4'>
              <Button
                size='lg'
                className='h-14 px-8 text-lg glass-button rounded-full w-full sm:w-auto'
                onClick={handleAuthAction}
              >
                {user ? "Go to Dashboard" : "Start Your Project"}
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
              <Button
                variant='outline'
                size='lg'
                asChild
                className='h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 w-full sm:w-auto'
              >
                <Link href='/welcome/contact'>View Our Services</Link>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 text-center border-t border-border/50 pt-8">
              <div>
                <h3 className="text-3xl font-bold text-foreground">500+</h3>
                <p className="text-sm text-muted-foreground mt-1">Projects Completed</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-foreground">98%</h3>
                <p className="text-sm text-muted-foreground mt-1">Client Satisfaction</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-foreground">24/7</h3>
                <p className="text-sm text-muted-foreground mt-1">Support Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Bento Grid Style */}
      <section id='services' className='py-24 relative overflow-hidden'>
        <div className="absolute inset-0 bg-secondary/30"></div>
        <div className='container px-4 md:px-6 relative z-10'>
          <div className='text-center max-w-3xl mx-auto mb-16'>
            <h2 className='text-3xl md:text-5xl font-bold mb-6'>Comprehensive Technical Solutions</h2>
            <p className='text-muted-foreground text-lg'>
              From initial planning to final handover, we handle every aspect of network infrastructure with uncompromising quality.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]'>
            {/* Large Feature Card */}
            <div className='md:col-span-2 glass-card rounded-3xl p-8 flex flex-col justify-between group overflow-hidden relative'>
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500 transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <h3 className='text-2xl font-bold mb-2'>FTTH Establishment</h3>
                <p className='text-muted-foreground max-w-md'>
                  End-to-end fiber deployment including civil works, cable laying, splicing, and termination. We ensure high-speed connectivity reaches every doorstep.
                </p>
              </div>
              <div className="relative z-10 mt-6 flex gap-2">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">Planning</Badge>
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">Survey</Badge>
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">Deployment</Badge>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className='glass-card rounded-3xl p-8 flex flex-col justify-between group hover:-translate-y-1 transition-transform'>
              <div className="h-12 w-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                <Settings className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className='text-xl font-bold mb-2'>Maintenance</h3>
                <p className='text-muted-foreground text-sm'>
                  Proactive monitoring and rapid repair services to minimize downtime and ensure network reliability.
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className='glass-card rounded-3xl p-8 flex flex-col justify-between group hover:-translate-y-1 transition-transform'>
              <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className='text-xl font-bold mb-2'>Quality Assurance</h3>
                <p className='text-muted-foreground text-sm'>
                  Rigorous testing protocols and compliance with international safety and performance standards.
                </p>
              </div>
            </div>

            {/* Large Feature Card 2 */}
            <div className='md:col-span-2 glass-card rounded-3xl p-8 flex flex-col justify-between group overflow-hidden relative'>
              <div className="absolute left-0 bottom-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-500 transform -translate-x-1/2 translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <HardHat className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className='text-2xl font-bold mb-2'>Civil Infrastructure</h3>
                <p className='text-muted-foreground max-w-md'>
                  Specialized civil works including micro-trenching, duct installation, and chamber construction with minimal environmental impact.
                </p>
              </div>
              <Button variant="link" className="w-fit p-0 h-auto text-primary group-hover:translate-x-1 transition-transform">
                Learn more about our process <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className='py-24 bg-background relative'>
        <div className='container px-4 md:px-6'>
          <div className='text-center max-w-3xl mx-auto mb-16'>
            <h2 className='text-3xl md:text-5xl font-bold mb-6'>Why Industry Leaders Choose NNS</h2>
            <p className='text-muted-foreground text-lg'>
              We combine technical expertise with operational excellence to deliver superior results.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors'>
              <div className='h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-lg mb-4'>
                <Users className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-lg font-bold mb-2'>Expert Teams</h3>
              <p className='text-muted-foreground text-sm'>
                Highly skilled technicians and engineers with years of field experience.
              </p>
            </div>

            <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors'>
              <div className='h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-lg mb-4'>
                <Clock className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-lg font-bold mb-2'>On-Time Delivery</h3>
              <p className='text-muted-foreground text-sm'>
                Strict adherence to project timelines through efficient project management.
              </p>
            </div>

            <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors'>
              <div className='h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-lg mb-4'>
                <Trophy className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-lg font-bold mb-2'>Premium Quality</h3>
              <p className='text-muted-foreground text-sm'>
                Using top-tier materials and equipment for long-lasting infrastructure.
              </p>
            </div>

            <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors'>
              <div className='h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-lg mb-4'>
                <Zap className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-lg font-bold mb-2'>Rapid Response</h3>
              <p className='text-muted-foreground text-sm'>
                Agile support teams ready to address immediate technical requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-24 relative overflow-hidden'>
        <div className="absolute inset-0 bg-primary skew-y-3 transform origin-bottom-left scale-110"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

        <div className='container px-4 md:px-6 relative z-10 text-center'>
          <h2 className='text-3xl md:text-5xl font-bold text-primary-foreground mb-6'>
            Ready to Transform Your Network?
          </h2>
          <p className='text-primary-foreground/90 text-xl max-w-2xl mx-auto mb-10'>
            Join hands with NNS Enterprise for reliable, scalable, and efficient fiber optic solutions.
          </p>

          <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
            <Button
              size='lg'
              variant="secondary"
              className='h-14 px-8 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1'
              onClick={handleAuthAction}
            >
              {user ? "Go to Dashboard" : "Get Started Now"}
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
            <Button
              size='lg'
              className='h-14 px-8 text-lg rounded-full bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-all'
              asChild
            >
              <Link href='/welcome/contact'>Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
