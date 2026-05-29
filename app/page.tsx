import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const highlights = [
  {
    title: "Curated academic resources",
    description: "Upload, review, bookmark, and discover trusted study materials across departments."
  },
  {
    title: "Collaborative study rooms",
    description: "Meet live with classmates, share files, and stay in sync with presence, typing, and pinned messages."
  },
  {
    title: "Moderated university workflows",
    description: "Keep quality high with approval queues, announcements, notifications, and audit logging."
  }
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden px-6 py-12 md:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col justify-center gap-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl font-semibold text-neutral-950 dark:text-white">
            Erudytium
          </Link>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-full border border-primary/20 bg-white/80 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-white dark:bg-neutral-900/50 dark:hover:bg-neutral-900">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-full border border-primary/20 bg-white/80 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-white dark:bg-neutral-900/50 dark:hover:bg-neutral-900"
              >
                Open dashboard
              </Link>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
          </div>
        </div>
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              E-Library System with Real-Time Study Rooms
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-5xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-6xl">
                Erudytium centralises study materials, collaboration, and academic operations.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-neutral-700 dark:text-neutral-200">
                Built for students, lecturers, and administrators who need an opinionated academic workspace with strong moderation, search, and real-time communication.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                    Create account
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="rounded-full border border-primary/20 bg-white/80 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white dark:bg-neutral-900/50 dark:hover:bg-neutral-900">
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Go to dashboard
                </Link>
              </SignedIn>
            </div>
          </div>

          <div className="glass-panel relative overflow-hidden p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.25),transparent_32%)]" />
            <div className="relative space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Platform pillars</p>
                <h2 className="mt-2 font-display text-2xl font-bold">Operationally ready from day one</h2>
              </div>
              <div className="space-y-4">
                {highlights.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-white/40 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-900/60">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}