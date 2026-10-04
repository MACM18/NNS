/**
 * Email Service Abstraction
 * Supports both Resend and SMTP providers with encrypted credentials
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  preheader?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: EmailProvider;
  configSource?: "database" | "environment";
  configWarning?: string;
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

type ResolvedEmailConfig = {
  config: EmailConfig;
  source: "database" | "environment";
  warning?: string;
};

let cachedConfig: ResolvedEmailConfig | null = null;
let configCacheTime: number = 0;
let cachedBranding: { name: string; address: string; website: string; contacts: string[] } | null = null;
let brandingCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute cache

/**
 * Get email configuration from database or environment
 */
async function getEmailConfig(): Promise<ResolvedEmailConfig> {
  const now = Date.now();

  if (cachedConfig && now - configCacheTime < CONFIG_CACHE_TTL) return cachedConfig;

  let fallbackWarning: string | undefined;
  try {
    const dbConfig = await prisma.emailSettings.findFirst({ where: { isActive: true } });
    if (dbConfig) {
      try {
        cachedConfig = {
          source: "database",
          config: {
            provider: dbConfig.provider as EmailProvider,
            fromEmail: dbConfig.fromEmail,
            fromName: dbConfig.fromName,
            resendApiKey: dbConfig.resendApiKey ? decrypt(dbConfig.resendApiKey) : undefined,
            smtpHost: dbConfig.smtpHost || undefined,
            smtpPort: dbConfig.smtpPort || undefined,
            smtpSecure: dbConfig.smtpSecure,
            smtpUser: dbConfig.smtpUser || undefined,
            smtpPassword: dbConfig.smtpPassword ? decrypt(dbConfig.smtpPassword) : undefined,
          },
        };
        configCacheTime = now;
        return cachedConfig;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Saved email settings could not be decrypted; using environment fallback:", error);
        fallbackWarning = /authenticate data|encrypted data format|encryption_key|auth_secret/i.test(message)
          ? "Saved email credentials could not be decrypted with the current ENCRYPTION_KEY or AUTH_SECRET. Environment email settings were used instead."
          : "Saved email settings could not be read. Environment email settings were used instead.";
      }
    }
  } catch (error) {
    console.warn("Failed to fetch email config from database:", error);
    fallbackWarning = "Saved email settings could not be read. Environment email settings were used instead.";
  }

  const requestedProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || "", 10);
  const smtpSecureValue = process.env.SMTP_SECURE?.trim().toLowerCase();
  const environmentProvider: EmailProvider = requestedProvider === "smtp" || (!requestedProvider && Boolean(process.env.SMTP_HOST))
    ? "smtp"
    : "resend";

  cachedConfig = {
    source: "environment",
    warning: fallbackWarning,
    config: {
      provider: environmentProvider,
      fromEmail: process.env.EMAIL_FROM || "noreply@nns.lk",
      fromName: process.env.EMAIL_FROM_NAME || "NNS Enterprise",
      resendApiKey: process.env.RESEND_API_KEY,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587,
      smtpSecure: smtpSecureValue ? smtpSecureValue === "true" : smtpPort === 465,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
    },
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
  cachedBranding = null;
  brandingCacheTime = 0;
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
      attachments: options.attachments,
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
      attachments: options.attachments,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] || character);
}

function plainTextFromHtml(value: string): string {
  return value.replace(/<br\s*\/?>(?=.)/gi, "\n").replace(/<\/p\s*>/gi, "\n\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\n{3,}/g, "\n\n").trim();
}

async function getEmailBranding() {
  if (cachedBranding && Date.now() - brandingCacheTime < CONFIG_CACHE_TTL) return cachedBranding;
  try {
    const settings = await prisma.companySettings.findFirst({ orderBy: { createdAt: "asc" }, select: { companyName: true, address: true, website: true, contactNumbers: true } });
    cachedBranding = { name: settings?.companyName || "NNS Enterprise", address: settings?.address || "", website: settings?.website || "nns.lk", contacts: settings?.contactNumbers || [] };
  } catch {
    cachedBranding = { name: "NNS Enterprise", address: "", website: "nns.lk", contacts: [] };
  }
  brandingCacheTime = Date.now();
  return cachedBranding;
}

export async function renderBrandedEmail(options: Pick<EmailOptions, "html" | "text" | "preheader">) {
  const brand = await getEmailBranding();
  const name = escapeEmailHtml(brand.name);
  const websiteText = brand.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const websiteHref = /^https?:\/\//i.test(brand.website) ? brand.website : `https://${websiteText}`;
  const website = escapeEmailHtml(websiteText);
  const contacts = [brand.address, ...brand.contacts].map(escapeEmailHtml).filter(Boolean).join(" · ");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#263746"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${options.preheader ? escapeEmailHtml(options.preheader) : ""}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:24px 10px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce5eb;border-radius:8px;overflow:hidden"><tr><td style="background:#134160;padding:20px 24px;border-bottom:4px solid #1384b8"><div style="font-size:20px;line-height:26px;font-weight:bold;color:#ffffff">${name}</div><div style="margin-top:3px;font-size:11px;letter-spacing:1px;color:#d9edf6">ENTERPRISE SERVICES</div></td></tr><tr><td style="padding:24px;font-size:14px;line-height:1.6;color:#263746">${options.html}</td></tr><tr><td style="padding:15px 24px;background:#f7fafc;border-top:1px solid #e2eaf0;text-align:center;font-size:11px;line-height:1.5;color:#607383">${contacts ? `${contacts}<br>` : ""}<a href="${escapeEmailHtml(websiteHref)}" style="color:#135c83;text-decoration:underline">${website}</a><br>This is an automated message from ${name}.</td></tr></table></td></tr></table></body></html>`;
  const text = [options.text || plainTextFromHtml(options.html), "", brand.name, websiteText, contacts].filter(Boolean).join("\n");
  return { html, text };
}

/**
 * Main email sending function
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const resolved = await getEmailConfig();
  const branded = await renderBrandedEmail(options);
  const resultOptions = { ...options, ...branded };
  const result = resolved.config.provider === "smtp"
    ? await sendViaSMTP(resolved.config, resultOptions)
    : await sendViaResend(resolved.config, resultOptions);

  return {
    ...result,
    provider: resolved.config.provider,
    configSource: resolved.source,
    ...(resolved.warning ? { configWarning: resolved.warning } : {}),
  };
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

  const branded = await renderBrandedEmail(testOptions);
  const brandedOptions = { ...testOptions, ...branded };
  if (testConfig.provider === "smtp") {
    return sendViaSMTP(testConfig, brandedOptions);
  }

  return sendViaResend(testConfig, brandedOptions);
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
