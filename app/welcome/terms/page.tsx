import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsOfServicePage() {
  return (
    <PolicyPage title="Terms of Service" intro="A few practical rules for using the NNS Enterprise website and account area.">
      <h2>Using this website</h2>
      <p>The website shares information about NNS Enterprise and provides ways to contact us. Please use it lawfully and do not interfere with its security or availability. Project details, pricing, and commitments are confirmed separately in a written agreement.</p>

      <h2>Account access</h2>
      <p>Accounts are for authorized users. Keep your sign-in details secure and tell us if you believe someone else has accessed your account. Business information and connected spreadsheets should be used only with the permission of the relevant organization.</p>

      <h2>Content and external links</h2>
      <p>Unless stated otherwise, the content and branding on this website belong to NNS Enterprise or its licensors. You may view and share links to the site, but please ask before reusing its content commercially. Links to other websites are provided for convenience; those sites have their own terms and privacy practices.</p>

      <h2>Changes and contact</h2>
      <p>We may update the website and these terms. The date above identifies the current version. For questions about the site or these terms, please use our <Link href="/welcome/contact">contact page</Link>.</p>
    </PolicyPage>
  );
}
