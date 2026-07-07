import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeaderClient } from "./SiteHeaderClient";

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#docs", label: "Docs" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SiteHeaderClient
      navLinks={navLinks}
      email={user?.email ?? null}
      isLoggedIn={!!user}
    />
  );
}
