import Link from "next/link";
import { Briefcase, Twitter, Linkedin, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-muted py-12 text-muted-foreground">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-3 md:px-6">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-primary mb-4"
          >
            <Briefcase className="h-7 w-7" />
            <span>JobHunt</span>
          </Link>
          <p className="text-sm">
            Streamline your job search and land your dream job faster with
            AI-powered tools.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Quick Links
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="#features" className="hover:text-primary">
                Features
              </Link>
            </li>
            <li>
              <Link href="#benefits" className="hover:text-primary">
                Benefits
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-primary">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Connect With Us
          </h3>
          <div className="flex space-x-4">
            <Link href="#" aria-label="Twitter" className="hover:text-primary">
              <Twitter className="h-6 w-6" />
            </Link>
            <Link href="#" aria-label="LinkedIn" className="hover:text-primary">
              <Linkedin className="h-6 w-6" />
            </Link>
            <Link href="#" aria-label="Facebook" className="hover:text-primary">
              <Facebook className="h-6 w-6" />
            </Link>
          </div>
          <p className="mt-4 text-sm">
            &copy; {new Date().getFullYear()} JobHunt. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
