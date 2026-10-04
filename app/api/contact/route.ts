import { NextRequest, NextResponse } from "next/server";
import { escapeEmailHtml, sendEmail } from "@/lib/email-service";
import { z } from "zod";

// Zod schema for contact form validation
const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters long")
    .max(200, "Subject must be less than 200 characters")
    .trim(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters long")
    .max(5000, "Message must be less than 5000 characters")
    .trim(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body using Zod
    const validationResult = contactFormSchema.safeParse(body);

    if (!validationResult.success) {
      // Return detailed validation errors
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = validationResult.data;

    const result = await sendEmail({
      to: process.env.CONTACT_EMAIL_TO || "hello@macm.dev",
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      preheader: `New message from ${name}`,
      text: `New contact form message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      html: `<h2 style="margin:0 0 16px;color:#134160">New contact message</h2><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:7px 0;color:#607383">Name</td><td style="padding:7px 0">${escapeEmailHtml(name)}</td></tr><tr><td style="padding:7px 0;color:#607383">Email</td><td style="padding:7px 0"><a href="mailto:${escapeEmailHtml(email)}">${escapeEmailHtml(email)}</a></td></tr><tr><td style="padding:7px 0;color:#607383">Subject</td><td style="padding:7px 0">${escapeEmailHtml(subject)}</td></tr></table><div style="margin-top:16px;padding:14px;background:#f3f7fa;border-left:3px solid #1384b8;white-space:pre-wrap">${escapeEmailHtml(message)}</div>`,
    });

    if (!result.success) {
      console.error("Contact email provider error:", result.error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Email sent successfully", messageId: result.messageId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
