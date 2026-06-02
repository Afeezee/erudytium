"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type AuthWidgetProps = {
  mode: "sign-in" | "sign-up";
};

const appearance = {
  variables: {
    colorPrimary: "#1B4F72",
    colorText: "#0f172a",
    colorBackground: "transparent",
    colorInputBackground: "#ffffff",
    colorInputText: "#0f172a",
    colorTextSecondary: "#64748b"
  },
  elements: {
    rootBox: "w-full min-w-0",
    cardBox: "w-full min-w-0",
    card: "w-full bg-transparent shadow-none p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "min-h-12 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
    socialButtonsBlockButtonText: "font-medium text-slate-700",
    dividerLine: "bg-slate-200",
    dividerText: "text-slate-400",
    formFieldLabel: "font-medium text-slate-700",
    formFieldInput: "h-12 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm placeholder:text-slate-400",
    formFieldInputShowPasswordButton: "text-slate-500 hover:text-slate-700",
    formButtonPrimary: "mt-2 h-12 rounded-2xl bg-[#1B4F72] text-white shadow-lg shadow-[#1B4F72]/20 hover:bg-[#163f5b]",
    footerActionText: "text-slate-500",
    footerActionLink: "font-semibold text-[#1B4F72] hover:text-[#163f5b]",
    identityPreviewText: "text-slate-700",
    formResendCodeLink: "font-semibold text-[#1B4F72] hover:text-[#163f5b]",
    otpCodeFieldInput: "h-12 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
  }
} as const;

function AuthWidgetSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid gap-3">
        <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid gap-3">
        <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

export function AuthWidget({ mode }: AuthWidgetProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <AuthWidgetSkeleton />;
  }

  if (mode === "sign-up") {
    return <SignUp routing="hash" appearance={appearance} />;
  }

  return <SignIn routing="hash" appearance={appearance} />;
}