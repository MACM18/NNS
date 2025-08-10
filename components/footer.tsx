import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-gray-100 p-6 md:py-12 w-full dark:bg-gray-800">
      <div className="container max-w-7xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-sm">
        <div className="grid gap-1">
          <h3 className="font-semibold">Company</h3>
          <Link href="#">About Us</Link>
          <Link href="#">Our Team</Link>
          <Link href="#">Careers</Link>
          <Link href="#">News</Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-semibold">Products</h3>
          <Link href="#">Fiber Optic Cables</Link>
          <Link href="#">Networking Equipment</Link>
          <Link href="#">Installation Services</Link>
          <Link href="#">Maintenance Plans</Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-semibold">Resources</h3>
          <Link href="#">Blog</Link>
          <Link href="#">Case Studies</Link>
          <Link href="#">Whitepapers</Link>
          <Link href="#">Support</Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-semibold">Legal</h3>
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
          <Link href="#">Cookie Policy</Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-semibold">Contact</h3>
          <p>123 Fiber Optic Way</p>
          <p>Telecom City, TX 75001</p>
          <p>info@nnstelecom.com</p>
          <p>+1 (555) 123-4567</p>
        </div>
      </div>
      <div className="container max-w-7xl text-center mt-8 text-xs text-gray-500 dark:text-gray-400">
        © 2024 NNS Telecom. All rights reserved.
      </div>
    </footer>
  )
}
