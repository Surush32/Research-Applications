import { AuthForm } from "@/components/AuthForm";
import { Navbar } from "@/components/Navbar";

export default function SignupPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <AuthForm mode="signup" />
      </main>
    </>
  );
}
