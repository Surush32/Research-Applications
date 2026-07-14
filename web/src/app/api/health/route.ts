import { NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://catching-the-copy-bo.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Could not reach AST API" },
      { status: 502 }
    );
  }
}
