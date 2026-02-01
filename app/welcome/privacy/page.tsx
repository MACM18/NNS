import { Badge } from "@/components/ui/badge";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          Legal
        </Badge>
        <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4'>Privacy Policy</h1>
        <p className='text-muted-foreground'>Last updated: November 9, 2025</p>
      </section>

      <div className='container mx-auto px-4 pb-24 max-w-4xl relative z-10'>
        <div className="glass-card p-8 md:p-12 rounded-3xl">
          <div className='prose dark:prose-invert max-w-none space-y-6'>
            <p>
              NNS ("us", "we", or "our") operates the NNS Enterprise application
              (the "Service"). This page informs you of our policies regarding the
              collection, use, and disclosure of personal data when you use our
              Service and the choices you have associated with that data.
            </p>

            <h2 className='text-2xl font-semibold'>
              1. Information Collection and Use
            </h2>
            <p>
              We collect several different types of information for various purposes
              to provide and improve our Service to you.
            </p>

            <h3 className='text-xl font-semibold'>Personal Data</h3>
            <p>
              While using our Service, we may ask you to provide us with certain
              personally identifiable information that can be used to contact or
              identify you ("Personal Data"). This may include, but is not limited
              to:
            </p>
            <ul>
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Usage Data</li>
            </ul>

            <h2 className='text-2xl font-semibold'>
              2. Authentication and Data Storage
            </h2>
            <p>
              We use Supabase for user authentication and data storage. When you
              sign up or log in, your authentication data (such as email, hashed
              password, or OAuth provider details) and profile information are
              stored on Supabase's servers. Supabase is a third-party service and
              their use of your information is governed by their own privacy policy.
            </p>

            <h3 className='text-xl font-semibold'>Google Authentication</h3>
            <p>
              If you choose to sign in with Google, we use Supabase's Google Auth
              provider. We will receive access to basic profile information from
              your Google account, such as your name and email address, which we use
              to create and manage your account.
            </p>

            <h3 className='text-xl font-semibold'>Google Sheets Integration</h3>
            <p>
              Our Service offers an integration with Google Sheets. If you choose to
              use this feature, we will request your permission to access your
              Google Sheets. The permission we request is for full access (read,
              write, create, and delete) to the spreadsheets you connect. This level
              of access is required for the Service to fully manage and maintain the
              data within the sheets you attach to our platform. We will not access,
              modify, or delete any Google Sheets that you have not explicitly
              connected to our Service.
            </p>

            <h2 className='text-2xl font-semibold'>3. Use of Data</h2>
            <p>NNS uses the collected data for various purposes:</p>
            <ul>
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>
                To allow you to participate in interactive features of our Service
                when you choose to do so
              </li>
              <li>To provide customer support</li>
              <li>
                To gather analysis or valuable information so that we can improve
                our Service
              </li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>

            <h2 className='text-2xl font-semibold'>4. Data Security</h2>
            <p>
              The security of your data is important to us but remember that no
              method of transmission over the Internet or method of electronic
              storage is 100% secure. While we strive to use commercially acceptable
              means to protect your Personal Data, we cannot guarantee its absolute
              security.
            </p>

            <h2 className='text-2xl font-semibold'>5. Service Providers</h2>
            <p>
              We employ third-party companies and individuals to facilitate our
              Service ("Service Providers"), to provide the Service on our behalf,
              to perform Service-related services or to assist us in analyzing how
              our Service is used. These third parties have access to your Personal
              Data only to perform these tasks on our behalf and are - obligated not
              to disclose or use it for any other purpose.
            </p>
            <ul>
              <li>
                <strong>Supabase:</strong> Used for database hosting, real-time
                data, and authentication.
              </li>
            </ul>

            <h2 className='text-2xl font-semibold'>
              6. Changes to This Privacy Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you
              of any changes by posting the new Privacy Policy on this page. You are
              advised to review this Privacy Policy periodically for any changes.
            </p>

            <h2 className='text-2xl font-semibold'>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact
              us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
