import { AuthForm } from "@/components/AuthForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {error === "auth_callback_failed" && (
          <div className="mb-6 w-full max-w-md rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Email confirmation failed. Make sure the dev server is running at{" "}
            <strong>http://localhost:3000</strong>, then click the link again
            on this same computer.
          </div>
        )}
        <AuthForm mode="login" />
      </main>
      <SiteFooter />
    </>
  );
}
