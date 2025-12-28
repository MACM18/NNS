/**
 * Email Service Abstraction
 * Supports both Resend and SMTP providers with encrypted credentials
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailProvider = "resend" | "smtp";

interface EmailConfig {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  // Resend
  resendApiKey?: string;
  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}

let cachedConfig: EmailConfig | null = null;
let configCacheTime: number = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute cache

/**
 * Get email configuration from database or environment
 */
async function getEmailConfig(): Promise<EmailConfig> {
  const now = Date.now();

  // Return cached config if valid
  if (cachedConfig && now - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // Try to get config from database
    const dbConfig = await prisma.emailSettings.findFirst({
      where: { isActive: true },
    });

    if (dbConfig) {
      cachedConfig = {
        provider: dbConfig.provider as EmailProvider,
        fromEmail: dbConfig.fromEmail,
        fromName: dbConfig.fromName,
        resendApiKey: dbConfig.resendApiKey
          ? decrypt(dbConfig.resendApiKey)
          : undefined,
        smtpHost: dbConfig.smtpHost || undefined,
        smtpPort: dbConfig.smtpPort || undefined,
        smtpSecure: dbConfig.smtpSecure,
        smtpUser: dbConfig.smtpUser || undefined,
        smtpPassword: dbConfig.smtpPassword
          ? decrypt(dbConfig.smtpPassword)
          : undefined,
      };
      configCacheTime = now;
      return cachedConfig;
    }
  } catch (error) {
    console.warn("Failed to fetch email config from database:", error);
  }

  // Fallback to environment variables
  cachedConfig = {
    provider: "resend",
    fromEmail: process.env.EMAIL_FROM || "noreply@nns.lk",
    fromName: process.env.EMAIL_FROM_NAME || "NNS Enterprise",
    resendApiKey: process.env.RESEND_API_KEY,
  };
  configCacheTime = now;

  return cachedConfig;
}

/**
 * Clear the configuration cache (call after updating settings)
 */
export function clearEmailConfigCache(): void {
  cachedConfig = null;
  configCacheTime = 0;
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  config: EmailConfig,
  options: EmailOptions
): Promise<EmailResult> {
  if (!config.resendApiKey) {
    return { success: false, error: "Resend API key not configured" };
  }

  const resend = new Resend(config.resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(
  config: EmailConfig,
  options: EmailOptions
): Promise<EmailResult> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
    return { success: false, error: "SMTP configuration incomplete" };
  }

  const transporter: Transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpSecure ?? false,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Main email sending function
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const config = await getEmailConfig();

  if (config.provider === "smtp") {
    return sendViaSMTP(config, options);
  }

  return sendViaResend(config, options);
}

/**
 * Test email configuration
 */
export async function testEmailConfig(
  config: Partial<EmailConfig>
): Promise<EmailResult> {
  const testConfig: EmailConfig = {
    provider: config.provider || "resend",
    fromEmail: config.fromEmail || "test@nns.lk",
    fromName: config.fromName || "NNS Enterprise",
    resendApiKey: config.resendApiKey,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword,
  };

  const testOptions: EmailOptions = {
    to: testConfig.fromEmail, // Send to self
    subject: "NNS Email Configuration Test",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your email configuration.</p>
        <p><strong>Provider:</strong> ${testConfig.provider.toUpperCase()}</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This email was sent from NNS Enterprise settings page.
        </p>
      </div>
    `,
    text: `Email Configuration Test\n\nProvider: ${
      testConfig.provider
    }\nSent at: ${new Date().toISOString()}`,
  };

  if (testConfig.provider === "smtp") {
    return sendViaSMTP(testConfig, testOptions);
  }

  return sendViaResend(testConfig, testOptions);
}

/**
 * Email templates
 */
export const emailTemplates = {
  loginAlert: (
    email: string,
    ipAddress: string,
    device: string,
    time: Date
  ) => ({
    subject: "New Login to Your NNS Account",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #333;">New Login Detected</h2>
        <p>Hello,</p>
        <p>A new login was detected on your NNS Enterprise account.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>IP Address:</strong> ${ipAddress || "Unknown"}</p>
          <p><strong>Device:</strong> ${device || "Unknown"}</p>
          <p><strong>Time:</strong> ${time.toLocaleString()}</p>
        </div>
        <p>If this was you, you can safely ignore this email.</p>
        <p style="color: #c00;">If you did not log in, please change your password immediately and enable two-factor authentication.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          This is an automated security notification from NNS Enterprise.
        </p>
      </div>
    `,
    text: `New Login Detected\n\nEmail: ${email}\nIP Address: ${
      ipAddress || "Unknown"
    }\nDevice: ${
      device || "Unknown"
    }\nTime: ${time.toLocaleString()}\n\nIf this was you, you can safely ignore this email. If not, please change your password immediately.`,
  }),

  passwordExpireWarning: (email: string, daysRemaining: number) => ({
    subject: "Your NNS Password Will Expire Soon",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #f59e0b;">Password Expiration Warning</h2>
        <p>Hello,</p>
        <p>Your NNS Enterprise password will expire in <strong>${daysRemaining} day${
      daysRemaining === 1 ? "" : "s"
    }</strong>.</p>
        <p>Please log in and change your password from Settings → Security to avoid being locked out.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.NEXTAUTH_URL || "https://nns.lk"
          }/dashboard/settings" 
             style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Change Password
          </a>
        </div>
        <hr style="margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          This is an automated security notification from NNS Enterprise.
        </p>
      </div>
    `,
    text: `Password Expiration Warning\n\nYour password will expire in ${daysRemaining} day(s). Please change it from Settings → Security.`,
  }),

  twoFactorEnabled: (email: string) => ({
    subject: "Two-Factor Authentication Enabled",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #10b981;">2FA Enabled Successfully</h2>
        <p>Hello,</p>
        <p>Two-factor authentication has been successfully enabled on your NNS Enterprise account.</p>
        <p>From now on, you'll need your authenticator app to log in.</p>
        <div style="background: #fef3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <strong>Important:</strong> Make sure you've saved your backup codes in a safe place. 
          You'll need them if you lose access to your authenticator app.
        </div>
        <p>If you did not enable 2FA, please contact support immediately.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          This is an automated security notification from NNS Enterprise.
        </p>
      </div>
    `,
    text: `Two-Factor Authentication Enabled\n\nHello,\n\n2FA has been enabled on your account. Make sure you've saved your backup codes.\n\nIf you did not enable 2FA, please contact support immediately.`,
  }),

  twoFactorDisabled: (email: string) => ({
    subject: "Two-Factor Authentication Disabled",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #ef4444;">2FA Disabled</h2>
        <p>Hello,</p>
        <p>Two-factor authentication has been disabled on your NNS Enterprise account.</p>
        <p style="color: #c00;">Your account is now less secure. We recommend re-enabling 2FA from Settings → Security.</p>
        <p>If you did not disable 2FA, please change your password immediately and contact support.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          This is an automated security notification from NNS Enterprise.
        </p>
      </div>
    `,
    text: `Two-Factor Authentication Disabled\n\nHello,\n\n2FA has been disabled on your account. Your account is now less secure.\n\nIf you did not disable 2FA, please change your password immediately.`,
  }),
};
