import { NextRequest, NextResponse } from "next/server";
import { buildExplainPrompt, buildLocalExplanation } from "@/lib/explain";
import type { ExplainRequest, ExplainResponse } from "@/types/explain";

function isExplainRequest(body: unknown): body is ExplainRequest {
  if (!body || typeof body !== "object") return false;
  const value = body as ExplainRequest;
  return (
    typeof value.suspectName === "string" &&
    typeof value.threshold === "number" &&
    value.scores != null &&
    typeof value.scores.aggregate === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    if (!isExplainRequest(body)) {
      return NextResponse.json(
        { error: "Invalid explanation request." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const baseUrl = (
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
    ).replace(/\/$/, "");

    if (!apiKey) {
      const response: ExplainResponse = {
        explanation: buildLocalExplanation(body),
        source: "local",
      };
      return NextResponse.json(response);
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You explain code-similarity warnings for students. Stay practical and avoid legal overclaims.",
          },
          {
            role: "user",
            content: buildExplainPrompt(body),
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      // Fall back so the UI still works if the LLM call fails.
      const response: ExplainResponse = {
        explanation: `${buildLocalExplanation(
          body
        )}\n\n(AI provider unavailable right now: ${res.status}. Showing local guidance instead.)`,
        source: "local",
      };
      console.error("LLM explain failed:", detail);
      return NextResponse.json(response);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const explanation =
      data.choices?.[0]?.message?.content?.trim() ||
      buildLocalExplanation(body);

    const response: ExplainResponse = {
      explanation,
      source: data.choices?.[0]?.message?.content?.trim() ? "llm" : "local",
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate explanation.",
      },
      { status: 502 }
    );
  }
}
