"use client";

import { useState, useEffect } from "react";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building,
  Bell,
  Shield,
  Database,
  Palette,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Plus,
  CreditCard,
  Mail,
  Calendar,
  SettingsIcon,
  Smartphone,
  Key,
  Loader2,
  Copy,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { useTheme } from "next-themes";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const { addNotification } = useNotification();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Profile form data
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    avatar_url: "",
  });

  // Company settings data
  const [companyData, setCompanyData] = useState({
    company_name: "NNS Enterprise",
    address: "",
    contact_numbers: [""],
    website: "",
    registered_number: "",
    pricing_tiers: [
      { min_length: 0, max_length: 100, rate: 6000 },
      { min_length: 101, max_length: 200, rate: 6500 },
      { min_length: 201, max_length: 300, rate: 7200 },
      { min_length: 301, max_length: 400, rate: 7800 },
      { min_length: 401, max_length: 500, rate: 8200 },
      { min_length: 501, max_length: 999999, rate: 8400 },
    ],
    bank_details: {
      bank_name: "",
      account_title: "",
      account_number: "",
      branch_code: "",
      iban: "",
    },
  });

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    invoice_alerts: true,
    system_updates: false,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: "30",
    login_alerts: true,
    password_expiry: "90",
  });

  // 2FA state
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    canEnable: true,
    backupCodesRemaining: null as number | null,
    isOAuthUser: false,
  });
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    loading: false,
    qrCode: "",
    secret: "",
    backupCodes: [] as string[],
    showBackupCodes: false,
    verificationCode: "",
    step: "idle" as "idle" | "setup" | "qr" | "verify" | "backup" | "complete",
    regeneratePassword: "",
    showRegenerateDialog: false,
    disablePassword: "",
    showDisableDialog: false,
    error: "",
  });

  // Email settings state (Admin only)
  const [emailSettings, setEmailSettings] = useState({
    provider: "resend" as "resend" | "smtp",
    fromEmail: "noreply@nns.lk",
    fromName: "NNS Enterprise",
    resendApiKey: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    hasEnvConfig: false,
    loading: false,
    testing: false,
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    fetchCompanySettings();
    fetchNotificationSettings();
    fetchSecuritySettings();
    checkOAuthUser();
    fetch2FAStatus();
    if (["admin", "moderator"].includes((profile?.role || "").toLowerCase())) {
      fetchEmailSettings();
    }
  }, [user, profile?.role]);

  const checkOAuthUser = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/profile/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        // Check if user has Google account and no password
        setIsOAuthUser(data.isOAuthUser || false);
      }
    } catch (error) {
      console.error("Error checking OAuth status:", error);
    }
  };

  const normalizeTiers = (tiers: any): typeof companyData.pricing_tiers => {
    if (!tiers) return companyData.pricing_tiers;
    // If tiers is an object keyed by range like { "0-100": 6000, "500+": 8400 }
    if (typeof tiers === "object" && !Array.isArray(tiers)) {
      return Object.entries(tiers).map(([range, rate]) => {
        if (range === "500+") {
          return {
            min_length: 501,
            max_length: 999999,
            rate: Number(rate) || 0,
          };
        }
        const [min, max] = range.split("-").map((v) => Number(v));
        return {
          min_length: Number.isFinite(min) ? min : 0,
          max_length: Number.isFinite(max) ? max : 999999,
          rate: Number(rate) || 0,
        };
      });
    }

    if (Array.isArray(tiers)) {
      return tiers.map((t: any) => ({
        min_length: Number(t.min_length) || 0,
        max_length:
          t.max_length === 999999 ||
          String(t.max_length) === "" ||
          t.max_length == null
            ? 999999
            : Number(t.max_length) || 999999,
        rate: Number(t.rate) || 0,
      }));
    }

    return companyData.pricing_tiers;
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings/company");
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        if (data) {
          setCompanyData({
            company_name:
              typeof data.company_name === "string" &&
              data.company_name.trim() !== ""
                ? data.company_name
                : "NNS Enterprise",
            address: typeof data.address === "string" ? data.address : "",
            contact_numbers: Array.isArray(data.contact_numbers)
              ? (data.contact_numbers as string[]).map((n) => String(n))
              : [""],
            website: typeof data.website === "string" ? data.website : "",
            registered_number:
              typeof data.registered_number === "string"
                ? data.registered_number
                : "",
            pricing_tiers: normalizeTiers(data.pricing_tiers),
            bank_details:
              data.bank_details &&
              typeof data.bank_details === "object" &&
              "bank_name" in data.bank_details &&
              "account_title" in data.bank_details &&
              "account_number" in data.bank_details &&
              "branch_code" in data.bank_details &&
              "iban" in data.bank_details
                ? {
                    bank_name: String(
                      (data.bank_details as any).bank_name ?? ""
                    ),
                    account_title: String(
                      (data.bank_details as any).account_title ?? ""
                    ),
                    account_number: String(
                      (data.bank_details as any).account_number ?? ""
                    ),
                    branch_code: String(
                      (data.bank_details as any).branch_code ?? ""
                    ),
                    iban: String((data.bank_details as any).iban ?? ""),
                  }
                : companyData.bank_details,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch("/api/settings/notifications");
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setNotificationSettings(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notification settings", err);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch("/api/settings/security");
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setSecuritySettings(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch security settings", err);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/status");
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setTwoFactorStatus({
            enabled: result.data.twoFactorEnabled,
            canEnable: result.data.canEnable2FA,
            backupCodesRemaining: result.data.backupCodesRemaining,
            isOAuthUser: result.data.isOAuthUser,
          });
          setSecuritySettings((prev) => ({
            ...prev,
            two_factor_enabled: result.data.twoFactorEnabled,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch 2FA status", err);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch("/api/settings/email");
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setEmailSettings((prev) => ({
            ...prev,
            provider: result.data.provider,
            fromEmail: result.data.fromEmail,
            fromName: result.data.fromName,
            resendApiKey: result.data.resendApiKey,
            smtpHost: result.data.smtpHost,
            smtpPort: result.data.smtpPort,
            smtpSecure: result.data.smtpSecure,
            smtpUser: result.data.smtpUser,
            smtpPassword: result.data.smtpPassword,
            hasEnvConfig: result.data.hasEnvConfig,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch email settings", err);
    }
  };

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error("User ID is not available.");
      }
      const response = await fetch(`/api/profile/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          bio: profileData.bio,
          avatarUrl: profileData.avatar_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      addNotification({
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const prepareCompanyPayload = (data: typeof companyData) => {
    const contact_numbers = (data.contact_numbers || [])
      .map((n) => String(n).trim())
      .filter((n) => n !== "");

    const pricing_tiers = (data.pricing_tiers || []).map((t) => ({
      min_length: Number(t.min_length) || 0,
      max_length:
        t.max_length === 999999 ||
        String(t.max_length) === "" ||
        t.max_length == null
          ? 999999
          : Number(t.max_length) || 999999,
      rate: Number(t.rate) || 0,
    }));

    const bank_details = {
      bank_name: String(data.bank_details.bank_name ?? ""),
      account_title: String(data.bank_details.account_title ?? ""),
      account_number: String(data.bank_details.account_number ?? ""),
      branch_code: String(data.bank_details.branch_code ?? ""),
      iban: String(data.bank_details.iban ?? ""),
    };

    return {
      company_name: String(data.company_name || "NNS Enterprise"),
      address: String(data.address || ""),
      contact_numbers,
      website: String(data.website || ""),
      registered_number: String(data.registered_number || ""),
      pricing_tiers,
      bank_details,
    };
  };

  const handleCompanyUpdate = async () => {
    setIsLoading(true);
    try {
      const payload = prepareCompanyPayload(companyData);

      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update company settings");
      }

      addNotification({
        title: "Company Settings Updated",
        message: "Company settings have been successfully updated.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to update notification preferences"
        );
      }

      addNotification({
        title: "Preferences Updated",
        message: "Notification preferences have been saved to your profile.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(securitySettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update security settings");
      }

      addNotification({
        title: "Security Settings Updated",
        message: "Security settings have been saved to your profile.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      addNotification({
        title: "Validation Error",
        message: "Please fill in all password fields.",
        type: "error",
        category: "system",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addNotification({
        title: "Validation Error",
        message: "New password and confirmation do not match.",
        type: "error",
        category: "system",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      addNotification({
        title: "Validation Error",
        message: "New password must be at least 8 characters long.",
        type: "error",
        category: "system",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }

      addNotification({
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        type: "success",
        category: "system",
      });

      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      addNotification({
        title: "Password Change Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA Functions
  const handleSetup2FA = async () => {
    setTwoFactorSetup((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set up 2FA");
      }

      const result = await response.json();
      setTwoFactorSetup((prev) => ({
        ...prev,
        loading: false,
        qrCode: result.data.qrCode,
        secret: result.data.secret,
        backupCodes: result.data.backupCodes,
        showBackupCodes: false,
        verificationCode: "",
        step: "qr",
        error: "",
      }));
    } catch (error: unknown) {
      setTwoFactorSetup((prev) => ({ ...prev, loading: false }));
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      addNotification({
        title: "2FA Setup Failed",
        message: errorMessage,
        type: "error",
        category: "system",
      });
    }
  };

  const handleVerify2FA = async () => {
    setTwoFactorSetup((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: twoFactorSetup.verificationCode,
          purpose: "setup",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid verification code");
      }

      setTwoFactorSetup((prev) => ({
        ...prev,
        loading: false,
        step: "backup",
        showBackupCodes: true,
      }));

      // Update status
      setTwoFactorStatus((prev) => ({
        ...prev,
        enabled: true,
        backupCodesRemaining: 10,
      }));
      setSecuritySettings((prev) => ({
        ...prev,
        two_factor_enabled: true,
      }));

      addNotification({
        title: "2FA Enabled",
        message:
          "Two-factor authentication has been enabled. Save your backup codes!",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      setTwoFactorSetup((prev) => ({ ...prev, loading: false }));
      addNotification({
        title: "Verification Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    }
  };

  const handleDisable2FA = async (password: string) => {
    setTwoFactorSetup((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disable 2FA");
      }

      setTwoFactorStatus({
        enabled: false,
        canEnable: true,
        backupCodesRemaining: null,
        isOAuthUser: false,
      });
      setSecuritySettings((prev) => ({
        ...prev,
        two_factor_enabled: false,
      }));
      setTwoFactorSetup({
        loading: false,
        qrCode: "",
        secret: "",
        backupCodes: [],
        showBackupCodes: false,
        verificationCode: "",
        step: "idle",
        regeneratePassword: "",
        showRegenerateDialog: false,
        disablePassword: "",
        showDisableDialog: false,
        error: "",
      });

      addNotification({
        title: "2FA Disabled",
        message: "Two-factor authentication has been disabled.",
        type: "success",
        category: "system",
      });
    } catch (error: unknown) {
      setTwoFactorSetup((prev) => ({ ...prev, loading: false }));
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      addNotification({
        title: "Disable Failed",
        message: errorMessage,
        type: "error",
        category: "system",
      });
    }
  };

  const handleRegenerateBackupCodes = async (password: string) => {
    setTwoFactorSetup((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate backup codes");
      }

      const result = await response.json();
      setTwoFactorSetup((prev) => ({
        ...prev,
        loading: false,
        backupCodes: result.data.backupCodes,
        showBackupCodes: true,
        step: "backup",
        showRegenerateDialog: false,
        regeneratePassword: "",
      }));
      setTwoFactorStatus((prev) => ({
        ...prev,
        backupCodesRemaining: 10,
      }));

      addNotification({
        title: "Backup Codes Regenerated",
        message: "New backup codes have been generated. Save them securely!",
        type: "success",
        category: "system",
      });
    } catch (error: unknown) {
      setTwoFactorSetup((prev) => ({ ...prev, loading: false }));
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      addNotification({
        title: "Regeneration Failed",
        message: errorMessage,
        type: "error",
        category: "system",
      });
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `NNS Enterprise - 2FA Backup Codes
Generated: ${new Date().toISOString()}

Keep these codes in a safe place. Each code can only be used once.

${twoFactorSetup.backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

If you lose access to your authenticator app, you can use these codes to sign in.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nns-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancel2FASetup = async () => {
    try {
      await fetch("/api/auth/2fa/setup", { method: "DELETE" });
    } catch {
      // Ignore errors
    }
    setTwoFactorSetup({
      loading: false,
      qrCode: "",
      secret: "",
      backupCodes: [],
      showBackupCodes: false,
      verificationCode: "",
      step: "idle",
      regeneratePassword: "",
      showRegenerateDialog: false,
      disablePassword: "",
      showDisableDialog: false,
      error: "",
    });
  };

  // Email Settings Functions (Admin only)
  const handleEmailSettingsUpdate = async (testOnly = false) => {
    setEmailSettings((prev) => ({
      ...prev,
      loading: !testOnly,
      testing: testOnly,
    }));
    try {
      const response = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: emailSettings.provider,
          fromEmail: emailSettings.fromEmail,
          fromName: emailSettings.fromName,
          resendApiKey: emailSettings.resendApiKey,
          smtpHost: emailSettings.smtpHost,
          smtpPort: emailSettings.smtpPort,
          smtpSecure: emailSettings.smtpSecure,
          smtpUser: emailSettings.smtpUser,
          smtpPassword: emailSettings.smtpPassword,
          testOnly,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update email settings");
      }

      addNotification({
        title: testOnly ? "Test Email" : "Email Settings Updated",
        message: result.message,
        type: result.success ? "success" : "error",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: testOnly ? "Test Failed" : "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setEmailSettings((prev) => ({ ...prev, loading: false, testing: false }));
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const response = await fetch("/api/settings/export");
      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const result = await response.json();

      // Convert to JSON and download
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nns-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification({
        title: "Data Exported",
        message: `Successfully exported ${Object.values(
          result.recordCounts
        ).reduce((a: any, b: any) => a + b, 0)} records.`,
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Export Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const addContactNumber = () => {
    setCompanyData((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, ""],
    }));
  };

  const removeContactNumber = (index: number) => {
    if (companyData.contact_numbers.length > 1) {
      setCompanyData((prev) => ({
        ...prev,
        contact_numbers: prev.contact_numbers.filter((_, i) => i !== index),
      }));
    }
  };

  const updateContactNumber = (index: number, value: string) => {
    setCompanyData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.map((num, i) =>
        i === index ? value : num
      ),
    }));
  };

  const handlePricingTierChange = (
    index: number,
    field: string,
    value: number
  ) => {
    setCompanyData((prev) => ({
      ...prev,
      pricing_tiers: prev.pricing_tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setCompanyData((prev) => ({
      ...prev,
      bank_details: { ...prev.bank_details, [field]: value },
    }));
  };

  if (!user && !loading) {
    return <AuthWrapper />;
  }

  return (
    <div className='space-y-6'>
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
            <SettingsIcon className='h-8 w-8' />
            <div className='flex-1'>
              <h1 className='text-3xl font-bold'>Settings</h1>
              <p className='text-muted-foreground'>
                Manage your account and application preferences
              </p>
            </div>
            {profile?.role && (
              <Badge variant='secondary' className='text-sm capitalize'>
                {profile.role}
              </Badge>
            )}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <TabsList
              className={`grid w-full ${
                ["admin", "moderator"].includes(
                  (profile?.role || "").toLowerCase()
                )
                  ? "grid-cols-7"
                  : "grid-cols-6"
              }`}
            >
              <TabsTrigger value='profile' className='flex items-center gap-2'>
                <User className='h-4 w-4' />
                <span className='hidden sm:inline'>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value='company'
                className='flex items-center gap-2'
                disabled={
                  !["admin", "moderator"].includes(
                    (profile?.role || "").toLowerCase()
                  )
                }
              >
                <Building className='h-4 w-4' />
                <span className='hidden sm:inline'>Company</span>
              </TabsTrigger>
              <TabsTrigger
                value='notifications'
                className='flex items-center gap-2'
              >
                <Bell className='h-4 w-4' />
                <span className='hidden sm:inline'>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value='security' className='flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                <span className='hidden sm:inline'>Security</span>
              </TabsTrigger>
              <TabsTrigger
                value='appearance'
                className='flex items-center gap-2'
              >
                <Palette className='h-4 w-4' />
                <span className='hidden sm:inline'>Appearance</span>
              </TabsTrigger>
              <TabsTrigger value='data' className='flex items-center gap-2'>
                <Database className='h-4 w-4' />
                <span className='hidden sm:inline'>Data</span>
              </TabsTrigger>
              {["admin", "moderator"].includes(
                (profile?.role || "").toLowerCase()
              ) && (
                <TabsTrigger value='email' className='flex items-center gap-2'>
                  <Mail className='h-4 w-4' />
                  <span className='hidden sm:inline'>Email</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value='profile' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* <div className='flex items-center gap-6'>
                    <Avatar className='h-24 w-24'>
                      <AvatarImage
                        src={profileData.avatar_url || "/placeholder.svg"}
                      />
                      <AvatarFallback className='text-lg'>
                        {profileData.full_name?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className='space-y-2'>
                      <Button variant='outline' size='sm'>
                        <Upload className='h-4 w-4 mr-2' />
                        Upload Photo
                      </Button>
                      <p className='text-sm text-muted-foreground'>
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div> */}

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='full_name'>Full Name</Label>
                      <Input
                        id='full_name'
                        value={profileData.full_name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            full_name: e.target.value,
                          })
                        }
                        placeholder='Enter your full name'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email'>Email Address</Label>
                      <Input
                        id='email'
                        value={user?.email || ""}
                        disabled
                        className='bg-muted'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='phone'>Phone Number</Label>
                      <Input
                        id='phone'
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        placeholder='Enter your phone number'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='address'>Address</Label>
                      <Input
                        id='address'
                        value={profileData.address}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: e.target.value,
                          })
                        }
                        placeholder='Enter your address'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='bio'>Bio</Label>
                    <Textarea
                      id='bio'
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          bio: e.target.value,
                        })
                      }
                      placeholder='Tell us about yourself'
                      rows={4}
                    />
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className='transition-all duration-200 hover:scale-105 active:scale-95'
                    >
                      {isLoading ? (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      ) : (
                        <Save className='h-4 w-4 mr-2' />
                      )}
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your account details and status
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-2'>
                      <Mail className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm'>{user?.email}</span>
                      <Badge variant='secondary'>Verified</Badge>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm'>
                        Joined{" "}
                        {new Date(
                          (user as any)?.createdAt || ""
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company Settings */}
            <TabsContent value='company' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Building className='h-5 w-5' />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Configure company details for invoices and documents
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='company_name'>Company Name</Label>
                      <Input
                        id='company_name'
                        value={companyData.company_name}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            company_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor='registered_number'>
                        Registered Number
                      </Label>
                      <Input
                        id='registered_number'
                        value={companyData.registered_number}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            registered_number: e.target.value,
                          })
                        }
                        placeholder='Company registration number'
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor='company_address'>Address</Label>
                    <Textarea
                      id='company_address'
                      value={companyData.address}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          address: e.target.value,
                        })
                      }
                      placeholder='Complete company address'
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor='website'>Website</Label>
                    <Input
                      id='website'
                      value={companyData.website}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          website: e.target.value,
                        })
                      }
                      placeholder='https://www.company.com'
                    />
                  </div>

                  <div>
                    <div className='flex items-center justify-between'>
                      <Label>Contact Numbers</Label>
                      <Button
                        type='button'
                        onClick={addContactNumber}
                        size='sm'
                        variant='outline'
                        className='gap-2'
                      >
                        <Plus className='h-4 w-4' />
                        Add Number
                      </Button>
                    </div>
                    <div className='space-y-2 mt-2'>
                      {companyData.contact_numbers.map((number, index) => (
                        <div key={index} className='flex gap-2'>
                          <Input
                            value={number}
                            onChange={(e) =>
                              updateContactNumber(index, e.target.value)
                            }
                            placeholder='Contact number'
                          />
                          <Button
                            type='button'
                            onClick={() => removeContactNumber(index)}
                            size='sm'
                            variant='outline'
                            disabled={companyData.contact_numbers.length === 1}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      onClick={handleCompanyUpdate}
                      disabled={isLoading}
                      className='transition-all duration-200 hover:scale-105 active:scale-95'
                    >
                      {isLoading ? (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      ) : (
                        <Save className='h-4 w-4 mr-2' />
                      )}
                      {isLoading ? "Saving..." : "Save Company Info"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Tiers</CardTitle>
                  <CardDescription>
                    Configure pricing based on cable length
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {companyData.pricing_tiers.map((tier, index) => (
                      <div
                        key={index}
                        className='grid grid-cols-4 gap-4 items-end'
                      >
                        <div>
                          <Label>Min Length (m)</Label>
                          <Input
                            type='number'
                            value={tier.min_length}
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "min_length",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Length (m)</Label>
                          <Input
                            type='number'
                            value={
                              tier.max_length === 999999 ? "" : tier.max_length
                            }
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "max_length",
                                e.target.value
                                  ? Number.parseInt(e.target.value)
                                  : 999999
                              )
                            }
                            placeholder='500+ (leave empty)'
                          />
                        </div>
                        <div>
                          <Label>Rate (LKR)</Label>
                          <Input
                            type='number'
                            value={tier.rate}
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "rate",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {tier.min_length}–
                          {tier.max_length === 999999
                            ? "500+"
                            : tier.max_length}
                          m: LKR {tier.rate}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <CreditCard className='h-5 w-5' />
                    Bank Details
                  </CardTitle>
                  <CardDescription>
                    Configure bank information for invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='bank_name'>Bank Name</Label>
                      <Input
                        id='bank_name'
                        value={companyData.bank_details.bank_name}
                        onChange={(e) =>
                          handleBankDetailsChange("bank_name", e.target.value)
                        }
                        placeholder='e.g., Sampath Bank PLC'
                      />
                    </div>
                    <div>
                      <Label htmlFor='account_title'>Account Title</Label>
                      <Input
                        id='account_title'
                        value={companyData.bank_details.account_title}
                        onChange={(e) =>
                          handleBankDetailsChange(
                            "account_title",
                            e.target.value
                          )
                        }
                        placeholder='Account holder name'
                      />
                    </div>
                    <div>
                      <Label htmlFor='account_number'>Account Number</Label>
                      <Input
                        id='account_number'
                        value={companyData.bank_details.account_number}
                        onChange={(e) =>
                          handleBankDetailsChange(
                            "account_number",
                            e.target.value
                          )
                        }
                        placeholder='Bank account number'
                      />
                    </div>
                    <div>
                      <Label htmlFor='branch_code'>Branch Code</Label>
                      <Input
                        id='branch_code'
                        value={companyData.bank_details.branch_code}
                        onChange={(e) =>
                          handleBankDetailsChange("branch_code", e.target.value)
                        }
                        placeholder='Branch code'
                      />
                    </div>
                    <div className='md:col-span-2'>
                      <Label htmlFor='iban'>IBAN</Label>
                      <Input
                        id='iban'
                        value={companyData.bank_details.iban}
                        onChange={(e) =>
                          handleBankDetailsChange("iban", e.target.value)
                        }
                        placeholder='PK36SCBL0000001123456702'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value='notifications' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about updates and
                    activities
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Email Notifications</Label>
                        <p className='text-sm text-muted-foreground'>
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_notifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Push Notifications</Label>
                        <p className='text-sm text-muted-foreground'>
                          Receive push notifications in browser
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.push_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            push_notifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Invoice Alerts</Label>
                        <p className='text-sm text-muted-foreground'>
                          Notifications about invoice generation and payments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.invoice_alerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            invoice_alerts: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>System Updates</Label>
                        <p className='text-sm text-muted-foreground'>
                          Notifications about system maintenance and updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.system_updates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            system_updates: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      onClick={handleNotificationUpdate}
                      className='transition-all duration-200 hover:scale-105 active:scale-95'
                    >
                      <Save className='h-4 w-4 mr-2' />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value='security' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Password & Authentication</CardTitle>
                  <CardDescription>
                    Manage your password and authentication settings
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {isOAuthUser ? (
                    <div className='p-4 border rounded-lg bg-muted'>
                      <p className='text-sm text-muted-foreground'>
                        You signed in with Google. Password changes are not
                        available for OAuth accounts.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div>
                        <Label htmlFor='current_password'>
                          Current Password
                        </Label>
                        <div className='relative'>
                          <Input
                            id='current_password'
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                              })
                            }
                            placeholder='Enter current password'
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor='new_password'>New Password</Label>
                        <Input
                          id='new_password'
                          type='password'
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder='Enter new password (min 8 characters)'
                        />
                      </div>

                      <div>
                        <Label htmlFor='confirm_password'>
                          Confirm New Password
                        </Label>
                        <Input
                          id='confirm_password'
                          type='password'
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder='Confirm new password'
                        />
                      </div>

                      <Button
                        onClick={handlePasswordChange}
                        disabled={isLoading}
                        className='transition-all duration-200 hover:scale-105'
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Two-Factor Authentication Card */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Smartphone className='h-5 w-5' />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security using an authenticator app
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {twoFactorStatus.enabled ? (
                    // 2FA is enabled - show status and management options
                    <div className='space-y-4'>
                      <div className='flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg animate-in slide-in-from-left duration-500'>
                        <CheckCircle className='h-5 w-5 text-green-600 animate-in zoom-in duration-300 delay-150' />
                        <span className='text-green-700 dark:text-green-300 font-medium'>
                          Two-factor authentication is enabled
                        </span>
                      </div>

                      <div className='flex items-center justify-between p-4 border rounded-lg'>
                        <div>
                          <p className='font-medium'>Backup Codes</p>
                          <p className='text-sm text-muted-foreground'>
                            {twoFactorStatus.backupCodesRemaining} of 10 backup
                            codes remaining
                          </p>
                        </div>
                        <Button
                          variant='outline'
                          onClick={() =>
                            setTwoFactorSetup((prev) => ({
                              ...prev,
                              showRegenerateDialog: true,
                            }))
                          }
                          disabled={twoFactorSetup.loading}
                          className='transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          {twoFactorSetup.loading ? (
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          ) : (
                            <RefreshCw className='h-4 w-4 mr-2 transition-transform hover:rotate-180 duration-300' />
                          )}
                          Regenerate Codes
                        </Button>
                      </div>

                      {/* Regenerate Backup Codes Dialog */}
                      {twoFactorSetup.showRegenerateDialog && (
                        <div className='p-4 border rounded-lg space-y-3 bg-muted/50 animate-in slide-in-from-top duration-300'>
                          <p className='text-sm font-medium'>
                            Confirm your password to regenerate backup codes
                          </p>
                          <Input
                            type='password'
                            value={twoFactorSetup.regeneratePassword}
                            onChange={(e) =>
                              setTwoFactorSetup((prev) => ({
                                ...prev,
                                regeneratePassword: e.target.value,
                              }))
                            }
                            placeholder='Enter your password'
                          />
                          <div className='flex gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                setTwoFactorSetup((prev) => ({
                                  ...prev,
                                  showRegenerateDialog: false,
                                  regeneratePassword: "",
                                }))
                              }
                            >
                              Cancel
                            </Button>
                            <Button
                              size='sm'
                              onClick={() =>
                                handleRegenerateBackupCodes(
                                  twoFactorSetup.regeneratePassword
                                )
                              }
                              disabled={
                                !twoFactorSetup.regeneratePassword ||
                                twoFactorSetup.loading
                              }
                            >
                              {twoFactorSetup.loading ? (
                                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                              ) : null}
                              Confirm
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show newly regenerated backup codes */}
                      {twoFactorSetup.backupCodes.length > 0 && (
                        <div className='p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 rounded-lg space-y-3 animate-in slide-in-from-bottom duration-500'>
                          <div className='flex items-center gap-2'>
                            <AlertTriangle className='h-5 w-5 text-yellow-600 animate-pulse' />
                            <p className='font-medium text-yellow-700 dark:text-yellow-300'>
                              New Backup Codes Generated
                            </p>
                          </div>
                          <p className='text-sm text-yellow-600 dark:text-yellow-400'>
                            Save these codes in a secure location. They will
                            only be shown once.
                          </p>
                          <div className='grid grid-cols-2 gap-2 p-3 bg-white dark:bg-gray-900 rounded border font-mono text-sm'>
                            {twoFactorSetup.backupCodes.map((code, index) => (
                              <div key={index} className='p-1'>
                                {code}
                              </div>
                            ))}
                          </div>
                          <div className='flex gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  twoFactorSetup.backupCodes.join("\n")
                                );
                                toast({
                                  title: "Copied to clipboard",
                                  description:
                                    "Backup codes copied successfully",
                                });
                              }}
                              className='transition-all duration-200 hover:scale-105 active:scale-95'
                            >
                              <Copy className='h-4 w-4 mr-2' />
                              Copy Codes
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={handleDownloadBackupCodes}
                              className='transition-all duration-200 hover:scale-105 active:scale-95'
                            >
                              <Download className='h-4 w-4 mr-2' />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className='pt-4 border-t space-y-3'>
                        <Button
                          variant='destructive'
                          onClick={() =>
                            setTwoFactorSetup((prev) => ({
                              ...prev,
                              showDisableDialog: true,
                            }))
                          }
                          disabled={twoFactorSetup.loading}
                          className='transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          Disable Two-Factor Authentication
                        </Button>

                        {/* Disable 2FA Dialog */}
                        {twoFactorSetup.showDisableDialog && (
                          <div className='p-4 border border-destructive/50 rounded-lg space-y-3 bg-destructive/5 animate-in slide-in-from-bottom duration-300'>
                            <p className='text-sm font-medium text-destructive'>
                              This will remove the extra security from your
                              account
                            </p>
                            <Input
                              type='password'
                              value={twoFactorSetup.disablePassword}
                              onChange={(e) =>
                                setTwoFactorSetup((prev) => ({
                                  ...prev,
                                  disablePassword: e.target.value,
                                }))
                              }
                              placeholder='Enter your password to confirm'
                            />
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setTwoFactorSetup((prev) => ({
                                    ...prev,
                                    showDisableDialog: false,
                                    disablePassword: "",
                                  }))
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() =>
                                  handleDisable2FA(
                                    twoFactorSetup.disablePassword
                                  )
                                }
                                disabled={
                                  !twoFactorSetup.disablePassword ||
                                  twoFactorSetup.loading
                                }
                              >
                                {twoFactorSetup.loading ? (
                                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                ) : null}
                                Disable 2FA
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : twoFactorSetup.step === "idle" ? (
                    // 2FA not enabled and not setting up - show enable button
                    <div className='space-y-4'>
                      <p className='text-sm text-muted-foreground'>
                        Two-factor authentication adds an additional layer of
                        security to your account by requiring a code from your
                        authenticator app when signing in.
                      </p>
                      {!twoFactorStatus.canEnable && (
                        <div className='p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
                          <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                            You need to set a password before enabling
                            two-factor authentication.
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={handleSetup2FA}
                        disabled={
                          !twoFactorStatus.canEnable || twoFactorSetup.loading
                        }
                        className='transition-all duration-200 hover:scale-105 active:scale-95'
                      >
                        {twoFactorSetup.loading ? (
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                        ) : (
                          <Key className='h-4 w-4 mr-2' />
                        )}
                        Enable Two-Factor Authentication
                      </Button>
                    </div>
                  ) : twoFactorSetup.step === "qr" ? (
                    // Step 1: Show QR code
                    <div className='space-y-4 animate-in slide-in-from-bottom-4 duration-500'>
                      <div className='p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg'>
                        <p className='text-sm text-blue-700 dark:text-blue-300'>
                          <strong>Step 1:</strong> Scan this QR code with your
                          authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                      </div>

                      <div className='flex justify-center p-4 bg-white rounded-lg animate-in zoom-in-50 duration-500 delay-100'>
                        {twoFactorSetup.qrCode && (
                          <img
                            src={twoFactorSetup.qrCode}
                            alt='2FA QR Code'
                            className='w-48 h-48'
                          />
                        )}
                      </div>

                      <div className='p-3 bg-gray-50 dark:bg-gray-900 rounded-lg'>
                        <p className='text-xs text-muted-foreground mb-1'>
                          Can&apos;t scan? Enter this code manually:
                        </p>
                        <div className='flex items-center gap-2'>
                          <code className='flex-1 p-2 bg-white dark:bg-gray-800 border rounded font-mono text-sm break-all'>
                            {twoFactorSetup.secret}
                          </code>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              navigator.clipboard.writeText(
                                twoFactorSetup.secret
                              );
                              toast({ title: "Secret copied to clipboard" });
                            }}
                          >
                            <Copy className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='verify_code'>
                          <strong>Step 2:</strong> Enter the 6-digit code from
                          your app
                        </Label>
                        <Input
                          id='verify_code'
                          type='text'
                          inputMode='numeric'
                          pattern='[0-9]*'
                          maxLength={6}
                          value={twoFactorSetup.verificationCode}
                          onChange={(e) =>
                            setTwoFactorSetup({
                              ...twoFactorSetup,
                              verificationCode: e.target.value.replace(
                                /\D/g,
                                ""
                              ),
                            })
                          }
                          placeholder='Enter 6-digit code'
                          className='font-mono text-center text-lg tracking-widest'
                        />
                        {twoFactorSetup.error && (
                          <p className='text-sm text-red-500'>
                            {twoFactorSetup.error}
                          </p>
                        )}
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          onClick={handleCancel2FASetup}
                          disabled={twoFactorSetup.loading}
                          className='transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVerify2FA}
                          disabled={
                            twoFactorSetup.verificationCode.length !== 6 ||
                            twoFactorSetup.loading
                          }
                          className='transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          {twoFactorSetup.loading ? (
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          ) : null}
                          Verify & Enable
                        </Button>
                      </div>
                    </div>
                  ) : twoFactorSetup.step === "backup" ? (
                    // Step 2: Show backup codes
                    <div className='space-y-4'>
                      <div className='flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg'>
                        <CheckCircle className='h-5 w-5 text-green-600' />
                        <span className='text-green-700 dark:text-green-300 font-medium'>
                          Two-factor authentication enabled successfully!
                        </span>
                      </div>

                      <div className='p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 rounded-lg space-y-3'>
                        <div className='flex items-center gap-2'>
                          <AlertTriangle className='h-5 w-5 text-yellow-600' />
                          <p className='font-medium text-yellow-700 dark:text-yellow-300'>
                            Save Your Backup Codes
                          </p>
                        </div>
                        <p className='text-sm text-yellow-600 dark:text-yellow-400'>
                          These codes can be used to access your account if you
                          lose your authenticator device. Each code can only be
                          used once. Store them in a secure location.
                        </p>
                        <div className='grid grid-cols-2 gap-2 p-3 bg-white dark:bg-gray-900 rounded border font-mono text-sm'>
                          {twoFactorSetup.backupCodes.map((code, index) => (
                            <div key={index} className='p-1'>
                              {code}
                            </div>
                          ))}
                        </div>
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              navigator.clipboard.writeText(
                                twoFactorSetup.backupCodes.join("\n")
                              );
                              toast({ title: "Copied to clipboard" });
                            }}
                            className='transition-all duration-200 hover:scale-105 active:scale-95'
                          >
                            <Copy className='h-4 w-4 mr-2' />
                            Copy Codes
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={handleDownloadBackupCodes}
                            className='transition-all duration-200 hover:scale-105 active:scale-95'
                          >
                            <Download className='h-4 w-4 mr-2' />
                            Download
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setTwoFactorSetup({
                            step: "idle",
                            qrCode: "",
                            secret: "",
                            backupCodes: [],
                            showBackupCodes: false,
                            verificationCode: "",
                            loading: false,
                            error: "",
                            regeneratePassword: "",
                            showRegenerateDialog: false,
                            disablePassword: "",
                            showDisableDialog: false,
                          });
                          fetch2FAStatus();
                        }}
                        className='transition-all duration-200 hover:scale-105 active:scale-95'
                      >
                        Done
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Preferences</CardTitle>
                  <CardDescription>
                    Configure additional security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Login Alerts</Label>
                      <p className='text-sm text-muted-foreground'>
                        Get notified when someone logs into your account
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.login_alerts}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          login_alerts: checked,
                        })
                      }
                    />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='session_timeout'>
                        Session Timeout (minutes)
                      </Label>
                      <Select
                        value={securitySettings.session_timeout}
                        onValueChange={(value) =>
                          setSecuritySettings({
                            ...securitySettings,
                            session_timeout: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='15'>15 minutes</SelectItem>
                          <SelectItem value='30'>30 minutes</SelectItem>
                          <SelectItem value='60'>1 hour</SelectItem>
                          <SelectItem value='120'>2 hours</SelectItem>
                          <SelectItem value='480'>8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='password_expiry'>
                        Password Expiry (days)
                      </Label>
                      <Select
                        value={securitySettings.password_expiry}
                        onValueChange={(value) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_expiry: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='30'>30 days</SelectItem>
                          <SelectItem value='60'>60 days</SelectItem>
                          <SelectItem value='90'>90 days</SelectItem>
                          <SelectItem value='180'>180 days</SelectItem>
                          <SelectItem value='365'>1 year</SelectItem>
                          <SelectItem value='0'>Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      onClick={handleSecurityUpdate}
                      className='transition-all duration-200 hover:scale-105 active:scale-95'
                    >
                      <Save className='h-4 w-4 mr-2' />
                      Save Security Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value='appearance' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Theme Preferences</CardTitle>
                  <CardDescription>
                    Customize the appearance of your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='theme'>Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='light'>Light</SelectItem>
                        <SelectItem value='dark'>Dark</SelectItem>
                        <SelectItem value='system'>System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Language</Label>
                    <Select defaultValue='en'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='en'>English</SelectItem>
                        <SelectItem value='si'>Sinhala</SelectItem>
                        <SelectItem value='ta'>Tamil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Format</Label>
                    <Select defaultValue='dd/mm/yyyy'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='dd/mm/yyyy'>DD/MM/YYYY</SelectItem>
                        <SelectItem value='mm/dd/yyyy'>MM/DD/YYYY</SelectItem>
                        <SelectItem value='yyyy-mm-dd'>YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Select defaultValue='lkr'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='lkr'>
                          Sri Lankan Rupee (LKR)
                        </SelectItem>
                        <SelectItem value='usd'>US Dollar (USD)</SelectItem>
                        <SelectItem value='eur'>Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value='data' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Data Export & Import</CardTitle>
                  <CardDescription>
                    Manage your data exports and imports
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Button
                      variant='outline'
                      className='h-20 flex-col gap-2'
                      onClick={handleExportData}
                      disabled={exportLoading}
                    >
                      <Download className='h-6 w-6' />
                      {exportLoading ? "Exporting..." : "Export All Data"}
                    </Button>
                    <Button
                      variant='outline'
                      className='h-20 flex-col gap-2'
                      disabled
                    >
                      <Upload className='h-6 w-6' />
                      Import Data (Coming Soon)
                    </Button>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {(profile?.role || "").toLowerCase() === "admin"
                      ? "As an admin, you can export all system data."
                      : (profile?.role || "").toLowerCase() === "moderator"
                      ? "As a moderator, you can export operational data (lines, tasks, inventory)."
                      : "You can export your personal data including profile and assigned tasks."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Cleanup</CardTitle>
                  <CardDescription>
                    Manage and cleanup your data
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <h4 className='font-medium'>Clear Cache</h4>
                        <p className='text-sm text-muted-foreground'>
                          Clear application cache and temporary files
                        </p>
                      </div>
                      <Button variant='outline' size='sm' disabled>
                        Coming Soon
                      </Button>
                    </div>

                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <h4 className='font-medium'>Archive Old Data</h4>
                        <p className='text-sm text-muted-foreground'>
                          Archive data older than 2 years
                        </p>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={
                          !["admin"].includes(
                            (profile?.role || "").toLowerCase()
                          )
                        }
                      >
                        {["admin"].includes((profile?.role || "").toLowerCase())
                          ? "Coming Soon"
                          : "Admin Only"}
                      </Button>
                    </div>

                    <div className='flex items-center justify-between p-4 border rounded-lg border-destructive'>
                      <div>
                        <h4 className='font-medium text-destructive'>
                          Delete All Data
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          Permanently delete all your data. This action cannot
                          be undone.
                        </p>
                      </div>
                      <Button
                        variant='destructive'
                        size='sm'
                        disabled={
                          !["admin"].includes(
                            (profile?.role || "").toLowerCase()
                          )
                        }
                      >
                        <Trash2 className='h-4 w-4 mr-2' />
                        {["admin"].includes((profile?.role || "").toLowerCase())
                          ? "Delete All"
                          : "Admin Only"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Settings - Admin/Moderator Only */}
            {["admin", "moderator"].includes(
              (profile?.role || "").toLowerCase()
            ) && (
              <TabsContent value='email' className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Mail className='h-5 w-5' />
                      Email Provider Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure the email provider for system notifications and
                      alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    {/* Provider Selection */}
                    <div className='space-y-3'>
                      <Label>Email Provider</Label>
                      <div className='grid grid-cols-2 gap-4'>
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                            emailSettings.provider === "resend"
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() =>
                            setEmailSettings({
                              ...emailSettings,
                              provider: "resend",
                            })
                          }
                        >
                          <div className='flex items-center gap-2'>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                emailSettings.provider === "resend"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            />
                            <span className='font-medium'>Resend</span>
                          </div>
                          <p className='text-sm text-muted-foreground mt-1 ml-6'>
                            Modern email API service
                          </p>
                        </div>
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                            emailSettings.provider === "smtp"
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() =>
                            setEmailSettings({
                              ...emailSettings,
                              provider: "smtp",
                            })
                          }
                        >
                          <div className='flex items-center gap-2'>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                emailSettings.provider === "smtp"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            />
                            <span className='font-medium'>SMTP</span>
                          </div>
                          <p className='text-sm text-muted-foreground mt-1 ml-6'>
                            Traditional email server
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resend Settings */}
                    {emailSettings.provider === "resend" && (
                      <div className='space-y-4 p-4 border rounded-lg animate-in slide-in-from-bottom-4 duration-500'>
                        <h4 className='font-medium'>
                          Resend API Configuration
                        </h4>
                        <div>
                          <Label htmlFor='resend_api_key'>API Key</Label>
                          <Input
                            id='resend_api_key'
                            type='password'
                            value={emailSettings.resendApiKey}
                            onChange={(e) =>
                              setEmailSettings({
                                ...emailSettings,
                                resendApiKey: e.target.value,
                              })
                            }
                            placeholder='re_xxxxxxxxxxxxxxxxxxxxxxxxx'
                          />
                          <p className='text-xs text-muted-foreground mt-1'>
                            Get your API key from{" "}
                            <a
                              href='https://resend.com/api-keys'
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-primary hover:underline'
                            >
                              resend.com/api-keys
                            </a>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SMTP Settings */}
                    {emailSettings.provider === "smtp" && (
                      <div className='space-y-4 p-4 border rounded-lg animate-in slide-in-from-bottom-4 duration-500'>
                        <h4 className='font-medium'>SMTP Configuration</h4>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <Label htmlFor='smtp_host'>SMTP Host</Label>
                            <Input
                              id='smtp_host'
                              value={emailSettings.smtpHost}
                              onChange={(e) =>
                                setEmailSettings({
                                  ...emailSettings,
                                  smtpHost: e.target.value,
                                })
                              }
                              placeholder='smtp.example.com'
                            />
                          </div>
                          <div>
                            <Label htmlFor='smtp_port'>SMTP Port</Label>
                            <Input
                              id='smtp_port'
                              type='number'
                              value={emailSettings.smtpPort}
                              onChange={(e) =>
                                setEmailSettings({
                                  ...emailSettings,
                                  smtpPort: parseInt(e.target.value) || 587,
                                })
                              }
                              placeholder='587'
                            />
                          </div>
                          <div>
                            <Label htmlFor='smtp_user'>SMTP Username</Label>
                            <Input
                              id='smtp_user'
                              value={emailSettings.smtpUser}
                              onChange={(e) =>
                                setEmailSettings({
                                  ...emailSettings,
                                  smtpUser: e.target.value,
                                })
                              }
                              placeholder='your-email@example.com'
                            />
                          </div>
                          <div>
                            <Label htmlFor='smtp_password'>SMTP Password</Label>
                            <Input
                              id='smtp_password'
                              type='password'
                              value={emailSettings.smtpPassword}
                              onChange={(e) =>
                                setEmailSettings({
                                  ...emailSettings,
                                  smtpPassword: e.target.value,
                                })
                              }
                              placeholder='App password or SMTP password'
                            />
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Switch
                            checked={emailSettings.smtpSecure}
                            onCheckedChange={(checked) =>
                              setEmailSettings({
                                ...emailSettings,
                                smtpSecure: checked,
                              })
                            }
                          />
                          <Label>Use SSL/TLS</Label>
                        </div>
                      </div>
                    )}

                    {/* From Email Settings */}
                    <div className='space-y-4 p-4 border rounded-lg'>
                      <h4 className='font-medium'>Sender Information</h4>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                          <Label htmlFor='from_email'>From Email</Label>
                          <Input
                            id='from_email'
                            type='email'
                            value={emailSettings.fromEmail}
                            onChange={(e) =>
                              setEmailSettings({
                                ...emailSettings,
                                fromEmail: e.target.value,
                              })
                            }
                            placeholder='noreply@yourdomain.com'
                          />
                        </div>
                        <div>
                          <Label htmlFor='from_name'>From Name</Label>
                          <Input
                            id='from_name'
                            value={emailSettings.fromName}
                            onChange={(e) =>
                              setEmailSettings({
                                ...emailSettings,
                                fromName: e.target.value,
                              })
                            }
                            placeholder='NNS System'
                          />
                        </div>
                      </div>
                    </div>

                    {/* Test Email */}
                    <div className='p-4 border rounded-lg bg-muted/50'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h4 className='font-medium'>
                            Test Email Configuration
                          </h4>
                          <p className='text-sm text-muted-foreground'>
                            Send a test email to verify your configuration
                          </p>
                        </div>
                        <Button
                          variant='outline'
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                "/api/settings/email/test",
                                {
                                  method: "POST",
                                }
                              );
                              const data = await res.json();
                              if (res.ok) {
                                toast({
                                  title: "Test email sent",
                                  description:
                                    "Check your inbox for the test email.",
                                });
                              } else {
                                toast({
                                  title: "Test failed",
                                  description:
                                    data.error || "Failed to send test email",
                                  variant: "destructive",
                                });
                              }
                            } catch {
                              toast({
                                title: "Error",
                                description: "Failed to send test email",
                                variant: "destructive",
                              });
                            }
                          }}
                          className='transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          <Mail className='h-4 w-4 mr-2' />
                          Send Test Email
                        </Button>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className='flex justify-end'>
                      <Button
                        onClick={() => handleEmailSettingsUpdate(false)}
                        className='transition-all duration-200 hover:scale-105 active:scale-95'
                      >
                        <Save className='h-4 w-4 mr-2' />
                        Save Email Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
