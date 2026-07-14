import { AuthForm } from "@/components/AuthForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {error === "auth_callback_failed" && (
          <div className="mb-6 w-full max-w-md rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Email confirmation failed.</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Dev server must be running at{" "}
                <strong>http://localhost:3000</strong>
              </li>
              <li>Click the email link on this same computer</li>
              <li>Use the same browser you signed up in</li>
            </ul>
            {detail && (
              <p className="mt-2 text-xs opacity-80">Details: {detail}</p>
            )}
            <p className="mt-3 text-xs">
              For local testing, disable{" "}
              <strong>Confirm email</strong> in Supabase → Authentication →
              Providers → Email.
            </p>
          </div>
        )}
        <AuthForm mode="login" />
      </main>
      <SiteFooter />
    </>
  );
}
