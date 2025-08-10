"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  ArrowRight,
  Users,
  Target,
  Award,
  Cable,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  Star,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"

// Define BlogPost type
type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  published_at: string
  [key: string]: any
}

// Mock statistics for demonstration
const mockStats = {
  totalLines: 15420,
  activeTasks: 89,
  completedProjects: 1250,
  customerSatisfaction: 98.5,
  monthlyGrowth: 12.3,
  teamMembers: 45,
}

// Mock testimonials
const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Operations Manager",
    company: "TechCorp Solutions",
    content:
      "NNS Enterprise has transformed our telecom infrastructure management. Their dashboard provides real-time insights that have improved our efficiency by 40%.",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "IT Director",
    company: "Global Communications",
    content:
      "The comprehensive reporting and task management features have streamlined our operations significantly. Highly recommended for any telecom business.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Project Coordinator",
    company: "ConnectPlus",
    content:
      "Outstanding support and intuitive interface. The inventory management system alone has saved us countless hours of manual work.",
    rating: 5,
  },
]

// Mock recent achievements
const achievements = [
  {
    icon: Award,
    title: "Industry Excellence Award 2024",
    description: "Recognized for innovation in telecom management solutions",
  },
  {
    icon: Users,
    title: "500+ Happy Clients",
    description: "Serving businesses across multiple industries worldwide",
  },
  {
    icon: CheckCircle,
    title: "99.9% Uptime",
    description: "Reliable service with minimal downtime guarantee",
  },
  {
    icon: Shield,
    title: "ISO 27001 Certified",
    description: "Highest standards of information security management",
  },
]

async function getRecentPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(3)

    if (error) {
      console.error("Error fetching blog posts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return []
  }
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    getRecentPosts().then(setRecentPosts)
  }, [])

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">NNS Enterprise</span>
            </Link>
          </div>
          <div className="hidden lg:flex lg:gap-x-8">
            <Link
              href="#features"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Testimonials
            </Link>
            <Link
              href="#blog"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/welcome/about"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/welcome/contact"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </div>
          <div className="flex lg:flex-1 lg:justify-end">
            <Button onClick={handleAuthAction} disabled={loading}>
              {loading ? (
                "Loading..."
              ) : user ? (
                <>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-24 sm:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              🚀 New: Advanced Analytics Dashboard Available
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Telecom Operations
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Streamline your telecommunications infrastructure with our comprehensive management platform. From line
              tracking to inventory management, we provide the tools you need to optimize operations and drive growth.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" className="text-base" onClick={handleAuthAction}>
                {user ? "Access Dashboard" : "Get Started"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" asChild className="text-base">
                <Link href="/welcome/contact">Schedule Demo</Link>
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{mockStats.totalLines.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Lines Managed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{mockStats.activeTasks}</div>
                <div className="text-sm text-muted-foreground">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{mockStats.completedProjects.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{mockStats.customerSatisfaction}%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">+{mockStats.monthlyGrowth}%</div>
                <div className="text-sm text-muted-foreground">Monthly Growth</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{mockStats.teamMembers}</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Comprehensive Telecom Management
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to manage your telecommunications infrastructure efficiently and effectively.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Cable className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Line Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track and manage telephone lines with detailed information, status monitoring, and automated
                    reporting.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <BarChart3 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Real-time insights and comprehensive analytics to make data-driven decisions for your business.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Task Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Assign, track, and manage tasks with automated workflows and progress monitoring.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Target className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Inventory Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Comprehensive inventory management with automated tracking, alerts, and optimization suggestions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Clock className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Real-time Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    24/7 monitoring with instant alerts and notifications for critical system events.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Award className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Advanced Reporting</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Generate detailed reports with customizable templates and automated delivery options.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by Industry Leaders
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our commitment to excellence has earned us recognition and trust from businesses worldwide.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {achievements.map((achievement, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                      <achievement.icon className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{achievement.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{achievement.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What Our Clients Say</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Don't just take our word for it. Here's what industry professionals say about our platform.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                    <CardDescription>
                      {testimonial.role} at {testimonial.company}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Updates Section */}
      <section id="blog" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Latest Updates & Insights</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Stay informed with our latest insights, industry news, and platform updates.
            </p>
          </div>

          {recentPosts.length > 0 ? (
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {recentPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      <Link href={`/welcome/blog/${post.slug}`}>{post.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
                    <div className="mt-4">
                      <Link
                        href={`/welcome/blog/${post.slug}`}
                        className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center"
                      >
                        Read more
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-16 text-center">
              <p className="text-muted-foreground">No recent posts available.</p>
              <Button asChild className="mt-4">
                <Link href="/welcome/blog">View All Posts</Link>
              </Button>
            </div>
          )}

          <div className="mt-12 text-center">
            <Button asChild variant="outline">
              <Link href="/welcome/blog">
                View All Posts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Transform Your Operations?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join thousands of businesses that trust NNS Enterprise for their telecom management needs.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="secondary" onClick={handleAuthAction}>
                {user ? "Go to Dashboard" : "Start Free Trial"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Link href="/welcome/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">NNS Enterprise</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Leading telecommunications management solutions for modern businesses.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/welcome/about" className="text-sm text-muted-foreground hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/welcome/contact" className="text-sm text-muted-foreground hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Resources</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/welcome/blog" className="text-sm text-muted-foreground hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/welcome/careers" className="text-sm text-muted-foreground hover:text-foreground">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">© 2024 NNS Enterprise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
