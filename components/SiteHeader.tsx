"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#tools", label: "Image Tools" },
  { href: "/#pdf-tools", label: "PDF Tools" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 text-gray-900 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-4 sm:px-10 lg:px-16">

        {/* Logo + tabs on the left */}

        <div className="flex items-center gap-8 lg:gap-12">

          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              I
            </div>

            <span className="text-2xl font-bold tracking-tight">
              ImageTools
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-base font-medium text-gray-600 lg:flex">

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === pathname
                    ? "text-blue-600"
                    : "transition hover:text-blue-600"
                }
              >
                {link.label}
              </Link>
            ))}

          </nav>

        </div>

        <div className="flex items-center gap-3">

          <Link
            href="/#tools"
            className="hidden rounded-lg bg-blue-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-blue-700 sm:block"
          >
            Explore Tools
          </Link>

          {/* Menu button on phones and tablets */}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 lg:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

        </div>

      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-gray-200 bg-white px-6 py-4 sm:px-10 lg:hidden"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-lg px-3 py-3 text-base font-semibold transition hover:bg-gray-50 ${
                    link.href === pathname ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/#tools"
            onClick={() => setMenuOpen(false)}
            className="mt-3 block rounded-lg bg-blue-600 px-5 py-3 text-center text-base font-semibold text-white transition hover:bg-blue-700 sm:hidden"
          >
            Explore Tools
          </Link>
        </nav>
      )}
    </header>
  );
}
