import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://catching-the-copy-bo.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const res = await fetch(`${API_URL}/compare`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: [{ msg: "Could not reach AST API" }] },
      { status: 502 }
    );
  }
}
