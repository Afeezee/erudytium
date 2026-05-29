import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      routing="hash"
      appearance={{
        variables: {
          colorPrimary: "#1B4F72",
          colorText: "#17202A",
          colorBackground: "transparent",
          colorInputBackground: "rgba(255,255,255,0.8)",
          colorInputText: "#17202A"
        },
        elements: {
          rootBox: "w-full",
          card: "bg-transparent shadow-none p-0",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          socialButtonsBlockButton: "rounded-2xl border border-slate-200",
          formButtonPrimary: "rounded-full bg-[#1B4F72] hover:bg-[#163f5b]"
        }
      }}
    />
  );
}