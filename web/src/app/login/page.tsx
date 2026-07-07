import { AuthForm } from "@/components/AuthForm";
import { Navbar } from "@/components/Navbar";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {error === "auth_callback_failed" && (
          <div className="mb-6 w-full max-w-md rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Email confirmation failed. Make sure the dev server is running at{" "}
            <strong>http://localhost:3000</strong>, then click the link again
            on this same computer. Or disable email confirmation in Supabase for
            local testing.
          </div>
        )}
        <AuthForm mode="login" />
      </main>
    </>
  );
}
