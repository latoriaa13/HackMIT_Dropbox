export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] justify-center bg-[var(--bg)] px-4 pb-16 pt-10 sm:px-6">
      {children}
    </div>
  );
}
