import { createClient } from "@/lib/supabase/server";
import { SiteHeaderClient } from "./SiteHeaderClient";

const guestLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#docs", label: "Docs" },
];

const appLinks = [
  { href: "/check", label: "Check" },
  { href: "/github", label: "GitHub" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/help", label: "Help" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  return (
    <SiteHeaderClient
      navLinks={isLoggedIn ? appLinks : guestLinks}
      email={user?.email ?? null}
      isLoggedIn={isLoggedIn}
    />
  );
}
