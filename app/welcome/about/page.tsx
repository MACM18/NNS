import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Globe, Award, CheckCircle } from "lucide-react";

export const metadata = {
  title: "About Us - NNS Enterprise",
  description:
    "Learn about NNS Enterprise, our mission, values, and commitment to excellence in business solutions.",
};

export default function AboutPage() {
  return (
    <div className='py-24'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        {/* Hero Section */}
        <div className='mx-auto max-w-3xl text-center'>
          <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-6xl'>
            About{" "}
            <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
              NNS Enterprise
            </span>
          </h1>
          <p className='mt-6 text-lg leading-8 text-muted-foreground'>
            Building bridges between vision and reality through innovative
            business solutions, strategic consulting, and unwavering commitment
            to client success.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className='mt-24 grid grid-cols-1 gap-8 lg:grid-cols-2'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center space-x-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                  <Building2 className='h-5 w-5 text-primary-foreground' />
                </div>
                <CardTitle className='text-2xl'>Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground leading-7'>
                To empower businesses with innovative solutions that drive
                sustainable growth, operational excellence, and competitive
                advantage. We are committed to being trusted partners in our
                clients' journey toward success, delivering value through
                expertise, integrity, and results-driven approaches.
              </p>
            </CardContent>
          </Card>

          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center space-x-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                  <Globe className='h-5 w-5 text-primary-foreground' />
                </div>
                <CardTitle className='text-2xl'>Our Vision</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground leading-7'>
                To be the leading catalyst for business transformation in Sri
                Lanka and beyond, recognized for our innovation, expertise, and
                unwavering commitment to client success. We envision a future
                where businesses thrive through strategic partnerships and
                sustainable practices.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values Section */}
        <section className='mt-24'>
          <div className='mx-auto max-w-2xl text-center'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Our Core Values
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              The principles that guide our actions and define our culture.
            </p>
          </div>

          <div className='mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'>
            <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
              <CardHeader>
                <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                  <CheckCircle className='h-6 w-6 text-primary-foreground' />
                </div>
                <CardTitle className='text-xl'>Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  We conduct business with the highest ethical standards,
                  building trust through transparency and honest communication.
                </p>
              </CardContent>
            </Card>

            <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
              <CardHeader>
                <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                  <Award className='h-6 w-6 text-primary-foreground' />
                </div>
                <CardTitle className='text-xl'>Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  We strive for excellence in everything we do, continuously
                  improving our services and exceeding client expectations.
                </p>
              </CardContent>
            </Card>

            <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
              <CardHeader>
                <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                  <Users className='h-6 w-6 text-primary-foreground' />
                </div>
                <CardTitle className='text-xl'>Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  We believe in the power of partnership, working closely with
                  clients to achieve shared goals and mutual success.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Company Story */}
        <section className='mt-24'>
          <div className='mx-auto max-w-4xl'>
            <Card>
              <CardHeader>
                <CardTitle className='text-3xl text-center'>
                  Our Story
                </CardTitle>
              </CardHeader>
              <CardContent className='prose prose-lg mx-auto text-muted-foreground'>
                <p className='leading-8'>
                  Founded with a vision to transform how businesses operate and
                  grow, NNS Enterprise has been at the forefront of business
                  innovation in Sri Lanka. Our journey began with a simple
                  belief: that every organization has the potential for
                  greatness when equipped with the right strategies, tools, and
                  partnerships.
                </p>
                <p className='leading-8 mt-6'>
                  Over the years, we have evolved from a small consulting firm
                  to a comprehensive business solutions provider, serving
                  clients across various industries. Our success is built on the
                  foundation of understanding our clients' unique challenges and
                  delivering tailored solutions that drive real results.
                </p>
                <p className='leading-8 mt-6'>
                  Today, NNS Enterprise stands as a trusted partner for
                  businesses seeking to navigate the complexities of modern
                  markets, embrace digital transformation, and achieve
                  sustainable growth. We continue to innovate and adapt,
                  ensuring our clients stay ahead in an ever-changing business
                  landscape.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Statistics */}
        <section className='mt-24 bg-muted/30 rounded-2xl p-12'>
          <div className='mx-auto max-w-2xl text-center'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Our Track Record
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              Numbers that speak to our commitment and success.
            </p>
          </div>

          <div className='mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center'>
            <div>
              <div className='text-4xl font-bold text-primary'>500+</div>
              <div className='mt-2 text-sm text-muted-foreground'>
                Projects Completed
              </div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary'>200+</div>
              <div className='mt-2 text-sm text-muted-foreground'>
                Happy Clients
              </div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary'>10+</div>
              <div className='mt-2 text-sm text-muted-foreground'>
                Years of Experience
              </div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary'>50+</div>
              <div className='mt-2 text-sm text-muted-foreground'>
                Team Members
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
