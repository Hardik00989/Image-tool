import Link from "next/link";

const toolLinks = [
  { href: "/background-remover", label: "Background Remover" },
  { href: "/image-resizer", label: "Image Resizer" },
  { href: "/image-compressor", label: "Image Compressor" },
  { href: "/image-to-pdf", label: "Image to PDF" },
  { href: "/crop-image", label: "Image Editor" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/contact", label: "Contact" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white text-gray-900">

      <div className="mx-auto grid max-w-7xl gap-12 lg:gap-16 px-6 py-14 sm:px-10 lg:px-16 md:grid-cols-3">

        {/* Brand */}

        <div>

          <Link
            href="/"
            className="text-2xl font-bold text-gray-900"
          >
            ImageTools
          </Link>

          <p className="mt-4 max-w-sm text-base leading-7 text-gray-500">
            Simple online tools for resizing, compressing,
            converting and editing images.
          </p>

        </div>

        {/* Tools */}

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            Tools
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 text-base text-gray-600">
            {toolLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </div>

        </div>

        {/* Company */}

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            Company
          </h3>

          <div className="mt-5 flex flex-col gap-4 text-base text-gray-600">
            {companyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </div>

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
