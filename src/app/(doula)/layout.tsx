import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

const nav = [
  { href: "/", label: "Home" },
  { href: "/families", label: "My families" },
  { href: "/visits", label: "Visits" },
  { href: "/payments", label: "Payments" },
  { href: "/settings", label: "Settings" },
];

export default async function DoulaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("DOULA");
  const doula = user.doulaId
    ? await prisma.doula.findUnique({ where: { id: user.doulaId } })
    : null;

  return (
    <div className="min-h-screen">
      <header className="bg-aubergine-deep text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay font-display text-lg font-semibold">
              m
            </span>
            <span>
              <span className="block font-display text-base font-semibold leading-tight">
                Maren
              </span>
              <span className="block text-[11px] leading-tight text-white/50">
                doula payments
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium leading-tight">{user.name}</span>
              <span className="block text-[11px] leading-tight text-white/50">
                {doula ? "Certified doula" : ""}
              </span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-mid text-sm font-semibold">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden" aria-label="Main mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/75 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 fade-in">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
        <div className="flex items-center justify-between border-t border-hairline pt-4 text-xs text-ink-faint">
          <Link href="/help" className="hover:text-ink-soft">
            How payments work
          </Link>
          <LogoutButton className="hover:text-ink-soft" />
        </div>
      </footer>
    </div>
  );
}
