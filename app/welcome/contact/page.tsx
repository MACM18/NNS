"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Send, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.success("Message Sent!", {
          description:
            "Thank you for contacting us. We will get back to you shortly.",
        });
      } else {
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details
            .map((err: any) => `${err.field}: ${err.message}`)
            .join("\n");
          toast.error("Validation Error", {
            description: errorMessages,
          });
        } else {
          toast.error("Error", {
            description:
              result.error || "Failed to send message. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Error", {
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          Contact Us
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          Get in Touch
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          Have questions or want to discuss a project? We're here to help.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-12 lg:grid-cols-2 lg:gap-24 items-start'>

          {/* Contact Info */}
          <div className='space-y-8 animate-fade-in-up'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden h-full">
              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-8'>
                Contact Information
              </h2>

              <div className='space-y-8'>
                <div className='flex items-start gap-4'>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className='h-6 w-6 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg text-foreground mb-1'>Phone</h3>
                    <Link href='tel:+94342263642' className='text-muted-foreground hover:text-primary transition-colors block'>
                      +94 34 2263 642
                    </Link>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className='h-6 w-6 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg text-foreground mb-1'>Email</h3>
                    <Link href='mailto:hello@macm.dev' className='text-muted-foreground hover:text-primary transition-colors block'>
                      hello@macm.dev
                    </Link>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className='h-6 w-6 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg text-foreground mb-1'>Office Address</h3>
                    <p className='text-muted-foreground'>
                      89, Welikala,<br />
                      Pokunuwita,<br />
                      Sri Lanka 12404
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-6 bg-secondary/30 rounded-2xl border border-border/50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Support Hours
                </h3>
                <p className="text-sm text-muted-foreground">
                  Monday - Friday: 9:00 AM - 6:00 PM <br />
                  Weekend support available for emergencies.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className='space-y-8 animate-fade-in-up animation-delay-200'>
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
              <h2 className='text-2xl font-bold tracking-tight text-foreground mb-6'>
                Send a Message
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
                    className="bg-background/50 border-input/50 focus:bg-background transition-colors"
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
                    className="bg-background/50 border-input/50 focus:bg-background transition-colors"
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
                    className="bg-background/50 border-input/50 focus:bg-background transition-colors"
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='message'>Message</Label>
                  <Textarea
                    id='message'
                    placeholder='How can we help you?'
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="bg-background/50 border-input/50 focus:bg-background transition-colors resize-none"
                  />
                </div>
                <Button
                  type='submit'
                  className='w-full glass-button'
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>Sending...</>
                  ) : (
                    <>Send Message <Send className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
