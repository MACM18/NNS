import { PublicLayout } from "@/components/layout/public-layout";

export default function TermsOfServicePage() {
  return (
    <PublicLayout>
      <div className='container mx-auto px-4 py-12 max-w-4xl'>
        <h1 className='text-4xl font-bold mb-6'>Terms of Service</h1>
        <div className='prose dark:prose-invert max-w-none space-y-6'>
          <p>Last updated: November 9, 2025</p>

          <p>
            Please read these Terms of Service ("Terms", "Terms of Service")
            carefully before using the NNS Enterprise application (the
            "Service") operated by NNS ("us", "we", or "our").
          </p>

          <p>
            Your access to and use of the Service is conditioned upon your
            acceptance of and compliance with these Terms. These Terms apply to
            all visitors, users, and others who wish to access or use the
            Service.
          </p>

          <h2 className='text-2xl font-semibold'>1. Accounts</h2>
          <p>
            When you create an account with us, you guarantee that you are above
            the age of 18, and that the information you provide us is accurate,
            complete, and current at all times. Inaccurate, incomplete, or
            obsolete information may result in the immediate termination of your
            account on the Service.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your
            account and password, including but not limited to the restriction
            of access to your computer and/or account. You agree to accept
            responsibility for any and all activities or actions that occur
            under your account and/or password.
          </p>

          <h2 className='text-2xl font-semibold'>
            2. Google Authentication and Data
          </h2>
          <p>
            Our Service uses Supabase for authentication, which includes the
            option to sign in with your Google account. By using Google
            Authentication, you authorize us to access certain information from
            your Google account as permitted by you and Google's terms of
            service.
          </p>
          <p>
            For certain features, such as Google Sheets integration, we will
            request your permission to access your Google Sheets. You grant us
            full permission to read, write, create, and delete spreadsheets and
            their data in your connected Google account to the extent necessary
            to provide the Service. We will only use this access to record and
            maintain the sheets you explicitly attach to the Service.
          </p>

          <h2 className='text-2xl font-semibold'>3. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality
            are and will remain the exclusive property of NNS and its licensors.
            The Service is protected by copyright, trademark, and other laws of
            both the United States and foreign countries.
          </p>

          <h2 className='text-2xl font-semibold'>
            4. Links To Other Web Sites
          </h2>
          <p>
            Our Service may contain links to third-party web sites or services
            that are not owned or controlled by NNS. We have no control over,
            and assume no responsibility for the content, privacy policies, or
            practices of any third-party web sites or services.
          </p>

          <h2 className='text-2xl font-semibold'>5. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior
            notice or liability, for any reason whatsoever, including without
            limitation if you breach the Terms.
          </p>

          <h2 className='text-2xl font-semibold'>6. Limitation Of Liability</h2>
          <p>
            In no event shall NNS, nor its directors, employees, partners,
            agents, suppliers, or affiliates, be liable for any indirect,
            incidental, special, consequential or punitive damages, including
            without limitation, loss of profits, data, use, goodwill, or other
            intangible losses, resulting from your access to or use of or
            inability to access or use the Service.
          </p>

          <h2 className='text-2xl font-semibold'>7. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the
            laws of the jurisdiction in which our company is established,
            without regard to its conflict of law provisions.
          </p>

          <h2 className='text-2xl font-semibold'>8. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace
            these Terms at any time. We will provide at least 30 days' notice
            prior to any new terms taking effect.
          </p>

          <h2 className='text-2xl font-semibold'>Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us.</p>
        </div>
      </div>
    </PublicLayout>
  );
}
