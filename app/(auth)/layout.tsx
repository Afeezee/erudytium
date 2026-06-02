export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(241,196,15,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.85),rgba(245,249,252,0.96))]" />
      <div className="pointer-events-none absolute -left-16 top-16 h-48 w-48 rounded-full bg-[#1B4F72]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#F4C542]/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white/80 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#12344b] px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.22),transparent_20%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="relative space-y-8">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white/12 text-xl font-bold text-white shadow-lg shadow-black/10">E</div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Academic Access Portal</p>
              <h1 className="mt-4 max-w-md font-display text-5xl font-bold leading-[1.02] text-white">Enter the study network built for shared focus.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/78">Move from approved library resources to real-time study rooms, lecturer announcements, and exam-driven collaboration without breaking context.</p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">One sign-in, every academic surface</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Library discovery, room discussions, announcements, requests, and moderation stay in the same workflow.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/12 bg-black/10 p-5 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">Built for real campus coordination</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Email alerts, role-aware access, and room activity make important updates hard to miss.</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 text-sm text-white/72">
            <span>Erudytium</span>
            <span>Focused access for campus teams</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-12">
          <div className="w-full max-w-[30rem] space-y-6">
            <div className="space-y-3 text-center xl:text-left">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[#1B4F72] text-xl font-bold text-white shadow-lg shadow-[#1B4F72]/20 xl:mx-0">E</div>
              <div>
                <h2 className="font-display text-3xl font-bold text-slate-900">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Sign in or create an account to reach your library, study rooms, announcements, and tracked requests.</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white px-4 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}