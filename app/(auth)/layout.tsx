export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-xl font-bold text-primary-foreground">E</div>
          <h1 className="mt-4 font-display text-3xl font-bold">Erudytium</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Secure access to the university e-library and collaborative study rooms.</p>
        </div>
        <div className="glass-panel p-6">{children}</div>
      </div>
    </main>
  );
}