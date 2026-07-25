import React from 'react';
import { SignIn } from "@clerk/react";
import ThemeToggle from './ThemeToggle';

export default function LoginPage({ onGuestLogin }) {
  function getCurrentYear() {
    return new Date().getFullYear();
  }

  return (
    <div className="min-h-screen w-full relative bg-slate-50 dark:bg-[#090b14] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
      {/* Theme Toggle (Top Right) */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Light Mode Dots */}
      <div
        className="absolute inset-0 z-0 pointer-events-none dark:hidden"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.25) 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)",
        }}
      />
      {/* Dark Mode Dots */}
      <div
        className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
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

          <div className="w-full max-w-[440px] flex flex-col items-center bg-white/70 dark:bg-[#11131a]/80 backdrop-blur-2xl p-3 sm:p-6 rounded-[2rem] border border-black dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(120,119,198,0.1)]">
            <div className="w-full flex justify-center">
              <SignIn
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: { width: "100%", overflow: "visible" },
                    cardBox: { boxShadow: "none", background: "transparent", border: "none", margin: 0, padding: 0, overflow: "visible" },
                    card: { boxShadow: "none", background: "transparent", border: "none", margin: 0, padding: 0, width: "100%", overflow: "visible" },
                    headerTitle: { color: "var(--clerk-text-main)" },
                    headerSubtitle: { color: "var(--clerk-text-muted)" },
                    socialButtonsBlockButtonText: { color: "var(--clerk-social-text)" },
                    formFieldLabel: { color: "var(--clerk-text-main)" },
                    formFieldInput: { 
                      color: "var(--clerk-input-text)", 
                      backgroundColor: "var(--clerk-input-bg)",
                      borderColor: "var(--clerk-border)"
                    },
                    dividerText: { color: "#9ca3af" },
                    dividerLine: { background: "#4b5563" },
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

            <div className="mt-4 w-full flex flex-col items-center justify-center px-4">
              <div className="flex w-full items-center gap-4 mb-4">
                <div className="h-[1px] flex-1 bg-black dark:bg-white/80"></div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-black dark:text-white">OR</span>
                <div className="h-[1px] flex-1 bg-black dark:bg-white/80"></div>
              </div>
              
              <button
                onClick={onGuestLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                </div>
                Continue as Guest
              </button>
            </div>
          </div>

          <div className="md:hidden mt-8 text-xs text-slate-400 dark:text-slate-500 font-medium">© {getCurrentYear()} Zaheer's AI Inc. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
