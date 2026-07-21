"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your account...");

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          router.replace(
            `/login?error=auth_callback_failed&detail=${encodeURIComponent(
              error.message
            )}`
          );
          return;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as EmailOtpType | null;
      const next = params.get("next") ?? "/dashboard";
      const authError = params.get("error_description") ?? params.get("error");

      if (authError) {
        router.replace(
          `/login?error=auth_callback_failed&detail=${encodeURIComponent(
            authError
          )}`
        );
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(
            `/login?error=auth_callback_failed&detail=${encodeURIComponent(
              error.message
            )}`
          );
          return;
        }

        router.replace(next.startsWith("/") ? next : "/dashboard");
        router.refresh();
        return;
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (error) {
          router.replace(
            `/login?error=auth_callback_failed&detail=${encodeURIComponent(
              error.message
            )}`
          );
          return;
        }

        router.replace(next.startsWith("/") ? next : "/dashboard");
        router.refresh();
        return;
      }

      setMessage("Could not confirm your account.");
      router.replace("/login?error=auth_callback_failed");
    }

    handleCallback();
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <p className="text-sm text-muted">{message}</p>
    </main>
  );
}
