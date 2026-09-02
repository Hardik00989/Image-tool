"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#tools", label: "Tools" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 text-gray-900 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-4 sm:px-10 lg:px-16">

        {/* Logo + tabs on the left */}

        <div className="flex items-center gap-8 lg:gap-12">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              I
            </div>

            <span className="text-2xl font-bold tracking-tight">
              ImageTools
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-base font-medium text-gray-600 md:flex">

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

        <Link
          href="/#tools"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-blue-700"
        >
          Explore Tools
        </Link>

      </div>
    </header>
  );
}
