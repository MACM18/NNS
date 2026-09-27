import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <PolicyPage title="Cookie Policy" intro="The cookies and browser storage this site uses, and how to control optional measurement.">
      <p>Cookies are small pieces of information stored by your browser. This site also uses local storage and an offline cache. Some storage is needed for the features you request; performance measurement is optional.</p>

      <h2>What the site uses</h2>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Purpose</th><th>Technology</th><th>Choice</th></tr></thead>
          <tbody>
            <tr><td>Sign-in and account security</td><td>Authentication and security cookies</td><td>Needed when using an account</td></tr>
            <tr><td>Theme and site preferences</td><td>Browser local storage</td><td>Needed to remember your choices</td></tr>
            <tr><td>Remembering this consent choice</td><td>Browser local storage</td><td>Needed to respect your choice</td></tr>
            <tr><td>Offline support</td><td>Service worker and browser cache</td><td>Account-area offline feature</td></tr>
            <tr><td>Anonymous page performance</td><td>Speed Insights browser script; anonymous metrics</td><td>Only after you allow it</td></tr>
          </tbody>
        </table>
      </div>

      <p>Preference and consent records remain in your browser until you change them or clear site data. Sign-in cookies follow the account session settings. Offline cache data stays until your browser clears it or the app updates it.</p>

      <h2>Managing your choice</h2>
      <p>Choose “Necessary only” or “Allow performance” in the banner. To change your choice later, select “Cookie settings” in the footer of any public page. You can also clear the site’s stored data in your browser; doing so may sign you out and reset your preferences.</p>
      <p>For more about information we handle, read the <Link href="/welcome/privacy">Privacy Policy</Link>. If you have a question, use our <Link href="/welcome/contact">contact page</Link>.</p>
    </PolicyPage>
  );
}
