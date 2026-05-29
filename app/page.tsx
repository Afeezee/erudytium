import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const highlights = [
  {
    title: "Find useful materials faster",
    description: "Search notes, slides, and past resources by course, department, or topic without endless scrolling."
  },
  {
    title: "Study together in live rooms",
    description: "Chat with classmates in real time, share files, and keep important points pinned so nobody misses context."
  },
  {
    title: "Keep quality and trust high",
    description: "Moderation tools, clear announcements, and activity tracking help the community stay safe and focused."
  }
];

const quickSteps = [
  {
    title: "Create your account",
    description: "Sign up with your school email and set up your profile in a few minutes."
  },
  {
    title: "Explore your library",
    description: "Open your dashboard, find relevant content, and bookmark what you need for later."
  },
  {
    title: "Join or start a room",
    description: "Study with your group, ask questions, share updates, and stay aligned before exams."
  }
];

const audienceCards = [
  {
    title: "For students",
    points: ["Find trusted class materials quickly", "Save time with focused search and bookmarks", "Collaborate with classmates in one place"]
  },
  {
    title: "For lecturers",
    points: ["Share helpful resources for your courses", "Guide students with clear announcements", "Reduce confusion with one shared workspace"]
  },
  {
    title: "For administrators",
    points: ["Review uploads and requests with confidence", "Manage users, rooms, and content from one dashboard", "Track platform activity with clear logs"]
  }
];

const faqs = [
  {
    question: "Can I use Erudytium on my phone?",
    answer: "Yes. The platform is responsive and works across mobile, tablet, and desktop screens."
  },
  {
    question: "Do I need to pay to use it?",
    answer: "No. Your school or organization provides access, so you only need an approved account."
  },
  {
    question: "Can I control notifications?",
    answer: "Yes. You can choose which updates you want to receive in your notification settings."
  }
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden px-6 py-12 md:px-10 lg:px-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_15%_15%,rgba(46,134,193,0.25),transparent_35%),radial-gradient(circle_at_85%_5%,rgba(27,79,114,0.18),transparent_35%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-32 h-56 w-56 rounded-full bg-primary/10 blur-3xl float-slow" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-[32rem] h-64 w-64 rounded-full bg-accent/10 blur-3xl float-slow" />

      <div className="relative mx-auto max-w-7xl space-y-20">
        <header className="fade-up flex items-center justify-between gap-4">
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
        </header>

        <section className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="fade-up fade-up-delay-1 space-y-7">
            <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              E-Library System with Real-Time Study Rooms
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-5xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-6xl">
                The easiest way for your school community to find resources and study live.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-neutral-700 dark:text-neutral-200">
                Erudytium brings your digital library and group study space into one platform. Students can find reliable materials fast, lecturers can share updates clearly,
                and admins can keep everything organized from a single dashboard.
              </p>
              <p className="max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300">
                No jumping between scattered tools, no confusing workflows. Just one place to discover content, collaborate in real time, and stay on top of academic work.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                    Get started free
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="rounded-full border border-primary/20 bg-white/80 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white dark:bg-neutral-900/50 dark:hover:bg-neutral-900">
                    I already have an account
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Continue to dashboard
                </Link>
              </SignedIn>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-white/70 p-4 text-sm dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">One place</p>
                <p className="mt-1 text-neutral-600 dark:text-neutral-300">Library, group study, and updates together</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white/70 p-4 text-sm dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">Live rooms</p>
                <p className="mt-1 text-neutral-600 dark:text-neutral-300">Collaborate with classmates instantly</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-white/70 p-4 text-sm dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">Clear control</p>
                <p className="mt-1 text-neutral-600 dark:text-neutral-300">Admins manage users, content, and quality</p>
              </div>
            </div>
          </div>

          <div className="glass-panel fade-up fade-up-delay-2 relative overflow-hidden p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.25),transparent_32%)]" />
            <div className="relative space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">What you can do</p>
                <h2 className="mt-2 font-display text-2xl font-bold">Everything you need for study and content management</h2>
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

        <section aria-labelledby="how-it-works" className="fade-up fade-up-delay-1 space-y-8">
          <div className="max-w-3xl space-y-3">
            <h2 id="how-it-works" className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
              How Erudytium works
            </h2>
            <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
              From first login to exam prep, the experience stays simple. You always know where to find resources, where to collaborate, and where to get updates.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {quickSteps.map((step, index) => (
              <article key={step.title} className="glass-panel p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Step {index + 1}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-neutral-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="who-its-for" className="fade-up fade-up-delay-2 space-y-8">
          <div className="max-w-3xl space-y-3">
            <h2 id="who-its-for" className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Built for every role on campus
            </h2>
            <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
              Erudytium supports the full academic community, not just one group. Everyone gets tools designed for their day-to-day work.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {audienceCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-border bg-white/75 p-6 shadow-lg shadow-slate-900/5 dark:bg-slate-950/50">
                <h3 className="font-display text-2xl font-semibold text-neutral-900 dark:text-white">{card.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                  {card.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" className="fade-up fade-up-delay-2 space-y-8">
          <div className="max-w-3xl space-y-3">
            <h2 id="faq" className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Frequently asked questions
            </h2>
            <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
              Quick answers to common questions from new users.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((item) => (
              <article key={item.question} className="glass-panel p-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-700 dark:text-neutral-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel fade-up fade-up-delay-3 relative overflow-hidden p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(46,134,193,0.25),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Ready to make learning easier for your community?
              </h2>
              <p className="text-base leading-7 text-neutral-700 dark:text-neutral-300">
                Bring your school library and live group study experience into one accessible platform that helps students, lecturers, and admins stay connected.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                    Create your account
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                  Open dashboard
                </Link>
              </SignedIn>
              <Link
                href="/sign-in"
                className="rounded-full border border-primary/25 bg-white/80 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white dark:bg-neutral-900/60"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}