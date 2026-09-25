import Link from "next/link";
import { imageCategory, pdfTools } from "@/lib/tool-categories";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/contact", label: "Contact" },
];

const linkClass = "hover:text-blue-600";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white text-gray-900">

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 sm:px-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_2fr_1fr] lg:gap-12 lg:px-16">

        {/* Brand */}

        <div>

          <Link
            href="/"
            className="text-2xl font-bold text-gray-900"
          >
            ImageTools
          </Link>

          <p className="mt-4 max-w-sm text-base leading-7 text-gray-500">
            Free online image and PDF tools that run in your browser.
            Your files never leave your device.
          </p>

        </div>

        {/* Image Tools */}

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            Image Tools
          </h3>

          <ul className="mt-5 space-y-4 text-base text-gray-600">
            {imageCategory.tools.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={linkClass}
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>

        </div>

        {/* PDF Tools */}

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            PDF Tools
          </h3>

          <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 text-base text-gray-600">
            {pdfTools.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={linkClass}
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>

        </div>

        {/* Company */}

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            Company
          </h3>

          <ul className="mt-5 space-y-4 text-base text-gray-600">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={linkClass}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

        </div>

      </div>

      {/* Copyright */}

      <div className="border-t border-gray-200">

        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-base text-gray-500 sm:px-10 lg:px-16">
          © {new Date().getFullYear()} ImageTools. All rights reserved.
        </div>

      </div>

    </footer>
  );
}
