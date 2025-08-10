import Link from 'next/link'
import { Building2, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-muted">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-8">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">NNS Enterprise</span>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>info@nns.lk</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>+94 11 234 5678</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Colombo, Sri Lanka</span>
            </div>
          </div>
        </div>
        <div className="mt-6 md:mt-0">
          <div className="flex space-x-6">
            <Link href="/welcome/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/welcome/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/welcome/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Careers
            </Link>
            <Link href="/welcome/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            &copy; 2025 NNS Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
