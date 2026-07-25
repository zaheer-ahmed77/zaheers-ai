import React from 'react';
import { SignIn } from "@clerk/react";
import ThemeToggle from './ThemeToggle';

export default function LoginPage() {
  function getCurrentYear() {
    return new Date().getFullYear();
  }

  return (
    <div className="min-h-screen w-full relative bg-slate-50 dark:bg-[#090b14] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
      {/* Theme Toggle (Top Right) */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* New Modern Dot Pattern Background (Visible in Light & Dark Mode) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
          opacity: 0.15,
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen w-full">
        {/* Left Column: Branding & Copy */}
        <div className="hidden w-1/2 flex-col justify-between p-12 md:flex">
          <div className="flex items-center gap-3 font-semibold tracking-tighter text-xl dark:text-white">
            <img src="/logo.webp" alt="Zaheer's AI Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm dark:shadow-none dark:border dark:border-white/10" />
            Zaheer's AI
          </div>
          <div className="max-w-lg mb-20">
            <h1 className="mb-6 text-5xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
              Empower your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-emerald-500 to-indigo-600 dark:from-emerald-400 dark:via-indigo-400 dark:to-purple-400 animate-gradient-x">
                workflows.
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
              Unleash the full potential of your tasks with an autonomous AI agent. Experience a smarter way to analyze documents, write code, and solve problems.
            </p>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">© {getCurrentYear()} Zaheer's AI Inc. All rights reserved.</div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="flex w-full flex-col items-center justify-center p-4 md:w-1/2">
          
          {/* Mobile Branding Header */}
          <div className="md:hidden flex flex-col items-center mb-8 text-center space-y-2">
            <div className="flex items-center gap-2 font-semibold sm:font-bold tracking-tighter text-2xl dark:text-white">
              <img src="/logo.webp" alt="Zaheer's AI Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm dark:shadow-none dark:border dark:border-white/10" />
              Zaheer's AI
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Unleash the full potential of your tasks.</p>
          </div>

          <div className="w-full max-w-md flex justify-center bg-white/60 dark:bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-2xl">
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  // footerAction: { display: "none" },
                  card: { boxShadow: "none", backgroundColor: "transparent" },
                  headerTitle: { color: "var(--clerk-text-main)" },
                  headerSubtitle: { color: "var(--clerk-text-muted)" },
                  socialButtonsBlockButtonText: { color: "var(--clerk-social-text)" },
                  formFieldLabel: { color: "var(--clerk-text-main)" },
                  formFieldInput: { 
                    color: "var(--clerk-text-main)", 
                    backgroundColor: "var(--clerk-input-bg)",
                    borderColor: "var(--clerk-border)"
                  },
                  dividerText: { color: "var(--clerk-text-muted)" },
                  identityPreviewText: { color: "var(--clerk-text-main)" },
                  socialButtonsBlockButton: { 
                    backgroundColor: "var(--clerk-social-bg)", 
                    borderColor: "var(--clerk-border)",
                    color: "var(--clerk-social-text)"
                  }
                },
              }}
            />
          </div>

          <div className="md:hidden mt-8 text-xs text-slate-400 dark:text-slate-500 font-medium">© {getCurrentYear()} Zaheer's AI Inc. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
