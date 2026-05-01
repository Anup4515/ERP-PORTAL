import Image from "next/image";

export default function SetupPartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="WiserWits Logo"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg"
            />
            <span className="text-lg font-semibold text-primary-700">
              WiserWits
            </span>
          </div>

          {/* Sign out — rendered client-side via the page */}
        </div>
      </header>

      {/* Centered content */}
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
