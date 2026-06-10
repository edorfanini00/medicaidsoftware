import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Doula Billing",
  description: "Medicaid billing for doulas",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/doulas", label: "Doulas" },
  { href: "/clients", label: "Clients" },
  { href: "/claims", label: "Claims" },
  { href: "/payouts", label: "Payouts" },
  { href: "/rulesets", label: "State rules" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
            <div className="px-5 py-5 border-b border-slate-200">
              <Link href="/" className="block">
                <span className="text-lg font-semibold tracking-tight text-slate-900">
                  Doula Billing
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Medicaid RCM
                </span>
              </Link>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-8 py-8 max-w-6xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
