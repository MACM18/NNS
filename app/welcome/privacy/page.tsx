import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage title="Privacy Policy" intro="How NNS Enterprise handles information shared through this website and its account features.">
      <p>NNS Enterprise operates this website and its related account area. This notice covers information you provide to us and information needed to operate the service.</p>

      <h2>Information we receive</h2>
      <p>When you use the contact form, we receive your name, email address, subject, and message. If you use an account, we process the details needed for sign-in and your profile. Google sign-in may provide your name and email address. The site may also receive basic technical information, such as browser and connection details, in server logs.</p>
      <p>For authorized business users, the Google Sheets integration processes data from spreadsheets connected to the account to provide the requested import and sync features.</p>

      <h2>How we use it</h2>
      <p>We use this information to answer enquiries, provide account access, run the requested business features, maintain security, and resolve technical problems. Contact form messages are delivered to our inbox using an email service provider.</p>

      <h2>Cookies and performance measurement</h2>
      <p>Essential cookies and browser storage support sign-in and preferences; account users can also use offline features. Anonymous performance measurement runs only if you allow it in the cookie banner. You can change that choice at any time using “Cookie settings” in the footer. See our <Link href="/welcome/cookies">Cookie Policy</Link> for details.</p>

      <h2>Sharing and retention</h2>
      <p>We use hosting services, Resend for contact email delivery, Google for optional sign-in and connected Sheets, and Vercel Speed Insights if you allow performance measurement. They process information needed to provide those services. We keep information for as long as needed to operate the service, respond to enquiries, and meet applicable obligations.</p>

      <h2>Your choices and contact</h2>
      <p>You can ask about, correct, or request deletion of your personal information by using our <Link href="/welcome/contact">contact page</Link>. You can also choose whether optional performance measurement runs on your browser.</p>
      <p>We may update this notice when the site or its data practices change. The date above shows when it was last revised.</p>
    </PolicyPage>
  );
}
