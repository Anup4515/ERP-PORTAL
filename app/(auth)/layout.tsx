import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] bg-primary-600 flex-col items-center justify-center overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 via-transparent to-primary-900/40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-400/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-white/5 rounded-full" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <Image
              src="/logo.png"
              alt="WiserWits Logo"
              width={80}
              height={80}
              className="drop-shadow-lg rounded-lg"
              priority
            />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight mb-3">
            WiserWits
          </h1>
          <div className="w-16 h-1 bg-accent-400 rounded-full mb-5" />
          <p className="text-lg xl:text-xl text-primary-100/90 font-medium">
            Partner ERP Portal
          </p>
          <p className="mt-4 text-sm text-primary-200/60 max-w-xs leading-relaxed">
            Comprehensive management system for schools, coaching centres, colleges, and other partners.
          </p>
        </div>

        {/* Bottom decorative accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-400/50 to-transparent" />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-primary-600 px-6 py-5 flex items-center gap-3">
        <div className="p-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
          <Image
            src="/logo.png"
            alt="WiserWits Logo"
            width={36}
            height={36}
            className="rounded-md"
            priority
          />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">WiserWits</h1>
          <p className="text-xs text-primary-200/80">Partner ERP Portal</p>
        </div>
      </div>

      {/* Right Panel - Form Content */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-10 lg:py-0">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
