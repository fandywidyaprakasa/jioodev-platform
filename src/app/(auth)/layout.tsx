export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-6 text-center">
        <a href="/" className="font-display text-2xl font-semibold text-ink">
          JiooDev
        </a>
      </div>
      {children}
    </main>
  );
}
