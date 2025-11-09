"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setFormData({ name: "", email: "", subject: "", message: "" });
        toast({
          title: "Message Sent!",
          description:
            "Thank you for contacting us. We will get back to you shortly.",
          variant: "default",
        });
      } else {
        // Handle detailed validation errors from Zod
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details
            .map((err: any) => `${err.field}: ${err.message}`)
            .join("\n");
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description:
              result.error || "Failed to send message. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className='py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950'>
      <div className='container mx-auto px-4 md:px-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='max-w-3xl mx-auto text-center mb-12'>
            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              Get in Touch
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              Have questions or want to discuss a project? Reach out to us!
            </p>
          </div>

          <div className='grid gap-12 lg:grid-cols-2 lg:gap-24'>
            <div className='space-y-8'>
              <h2 className='text-3xl font-bold tracking-tight text-foreground'>
                Contact Information
              </h2>
              <div className='space-y-4'>
                <div className='flex items-center gap-4'>
                  <Phone className='h-6 w-6 text-primary' />
                  <div>
                    <Link href='tel:+94342263642' className='no-underline'>
                      <h3 className='font-semibold text-foreground'>Phone</h3>
                      <p className='text-muted-foreground'>+94 34 2263 642</p>
                    </Link>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <Mail className='h-6 w-6 text-primary' />
                  <div>
                    <Link href='mailto:hello@macm.dev' className='no-underline'>
                      <h3 className='font-semibold text-foreground'>Email</h3>
                      <p className='text-muted-foreground'>hello@macm.dev</p>
                    </Link>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <MapPin className='h-6 w-6 text-primary' />
                  <div>
                    <h3 className='font-semibold text-foreground'>Address</h3>
                    <p className='text-muted-foreground'>
                      89, Welikala, Pokunuwita, Sri Lanka 12404
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-8'>
              <h2 className='text-3xl font-bold tracking-tight text-foreground'>
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className='grid gap-6'>
                <div className='grid gap-2'>
                  <Label htmlFor='name'>Name</Label>
                  <Input
                    id='name'
                    placeholder='Your Name'
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='your@example.com'
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='subject'>Subject</Label>
                  <Input
                    id='subject'
                    placeholder='Subject of your message'
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='message'>Message</Label>
                  <Textarea
                    id='message'
                    placeholder='Your message here...'
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
