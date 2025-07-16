"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabase";
import { tr } from "date-fns/locale";
import Link from "next/link";

interface ContactData {
  contact_numbers: string[];
  company_name: string;
  address: string;
  website: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [contactData, setContactData] = useState({
    contact_numbers: [],
    company_name: "",
    address: "",
    website: "",
  } as ContactData);
  const supabase = getSupabaseClient();

  // Fetch data from the table
  const fetchContactData = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select(`contact_numbers,company_name,address,website`)
        .single();
      if (error) {
        toast({
          title: "Error fetching contact data",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      setContactData(data as ContactData);
      return data;
    } catch (error) {
      toast({
        title: "Error fetching contact data",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  useEffect(() => {
    fetchContactData();
  }, []);

  return (
    <div className='py-24'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        {/* Hero Section */}
        <div className='mx-auto max-w-2xl text-center'>
          <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-6xl'>
            Get in{" "}
            <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
              Touch
            </span>
          </h1>
          <p className='mt-6 text-lg leading-8 text-muted-foreground'>
            Ready to transform your business? Let's start a conversation about
            how we can help you achieve your goals.
          </p>
        </div>

        <div className='mt-24 grid grid-cols-1 gap-8 lg:grid-cols-2'>
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className='text-2xl'>Send us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Full Name</Label>
                  <Input
                    id='name'
                    name='name'
                    type='text'
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder='Enter your full name'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='email'>Email Address</Label>
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder='Enter your email address'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='message'>Message</Label>
                  <Textarea
                    id='message'
                    name='message'
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder='Tell us about your project or inquiry'
                    rows={6}
                  />
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className='space-y-8'>
            <Card>
              <CardHeader>
                <CardTitle className='text-2xl'>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-start space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                    <Mail className='h-5 w-5 text-primary-foreground' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>Email</h3>
                    <p className='text-muted-foreground'>
                      <Link href='mailto:infor@nns.lk'>info@nns.lk</Link>
                    </p>
                    <p className='text-muted-foreground'>
                      <Link href='mailto:support@nns.lk'>support@nns.lk</Link>
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                    <Phone className='h-5 w-5 text-primary-foreground' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>Phone</h3>
                    <div className='space-x-2 flex flex-row flex-wrap'>
                      {contactData?.contact_numbers?.map((item) => (
                        <p key={item} className='text-muted-foreground'>
                          <Link href={`tel:${item}`}>{item}</Link>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='flex items-start space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                    <MapPin className='h-5 w-5 text-primary-foreground' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>Address</h3>
                    <p className='text-muted-foreground'>
                      {contactData?.address.split(",").map((line, index) => (
                        <span key={index}>
                          {line}
                          {index < contactData.address.split(",").length - 1
                            ? ","
                            : "."}
                          {index <
                            contactData.address.split(",").length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary'>
                    <Clock className='h-5 w-5 text-primary-foreground' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>
                      Business Hours
                    </h3>
                    <p className='text-muted-foreground'>
                      Monday - Friday: 9:00 AM - 6:00 PM
                      <br />
                      Saturday: 9:00 AM - 5:00 PM
                      <br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Our Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='aspect-video w-full rounded-lg bg-muted flex items-center justify-center'>
                  <div className='text-center'>
                    <MapPin className='h-12 w-12 text-muted-foreground mx-auto mb-2' />
                    <p className='text-muted-foreground'>
                      Interactive map would be embedded here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
