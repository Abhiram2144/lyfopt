import { NextResponse, type NextRequest } from "next/server";
import { analyzeDayWithMeta, buildSystemPrompt, buildUserContext, extractJson, type AnalyzeDayPayload, type AnalyzeDayResult, normalizeResult } from "@/lib/ai";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV === "development";

// Development logging: conditional based on NODE_ENV
const devLog = (label: string, data?: unknown) => {
  if (isDev) {
    console.log(`[AI] ${label}`, data ? JSON.stringify(data, null, 2) : "");
  }
};

const devError = (label: string, error?: unknown) => {
  if (isDev) {
    console.error(`[AI ERROR] ${label}`, error instanceof Error ? error.message : error);
  }
};

/**
 * Call OpenAI API once with error handling and detailed logging
 */
async function callOpenAIOnce(
  payload: AnalyzeDayPayload,
  isRetry: boolean = false
): Promise<AnalyzeDayResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Validate API key early
  if (!apiKey) {
    if (isDev) throw new Error("OPENAI_API_KEY is not configured in environment");
    devLog("OPENAI_API_KEY missing, falling back to rule-based");
    return null;
  }

  const system = buildSystemPrompt();
  const user = `${buildUserContext(payload)}${isRetry ? "\n\nThis is a retry. Return ONLY the JSON object with no other text." : ""}`;
  
  devLog("AI_PROMPT_SENT", { 
    isRetry, 
    systemLength: system.length,
    userLength: user.length,
    hasSystemMessage: system.length > 0
  });

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            ...(system ? [{ role: "system" as const, content: system }] : []),
            {
              role: "user" as const,
              content: user,
            },
          ],
          temperature: 0.3, // Lower for more consistent JSON
          max_tokens: 1200,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      devError(`OPENAI_HTTP_ERROR: ${response.status}`, errorText);
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      error?: { message: string };
    };

    if (json.error) {
      devError("OPENAI_API_ERROR", json.error.message);
      return null;
    }

    if (!json.choices?.[0]) {
      devError("OPENAI_NO_CHOICES", "Empty response from OpenAI");
      return null;
    }

    const rawText = json.choices[0].message?.content ?? "";

    devLog("OPENAI_RAW_RESPONSE", { 
      finishReason: json.choices[0].finish_reason,
      textLength: rawText.length 
    });

    if (!rawText.trim()) {
      devError("OPENAI_EMPTY_TEXT", "No text in response");
      return null;
    }

    // Extract JSON with enhanced parsing
    const extractedJson = extractJson(rawText);
    if (!extractedJson) {
      devError("OPENAI_JSON_EXTRACTION_FAILED", rawText.slice(0, 200));
      return null;
    }

    devLog("OPENAI_JSON_EXTRACTED", { jsonLength: extractedJson.length });

    // Parse and normalize
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractedJson);
      devLog("OPENAI_JSON_PARSED", "Success");
    } catch (parseError) {
      devError("OPENAI_JSON_PARSE_ERROR", parseError);
      return null;
    }

    const normalized = normalizeResult(parsed);
    if (!normalized) {
      devError("OPENAI_NORMALIZATION_FAILED", parsed);
      return null;
    }

    devLog("OPENAI_SUCCESS", "Analysis complete");
    return normalized;
  } catch (error) {
    devError("OPENAI_CALL_EXCEPTION", error);
    return null;
  }
}

/**
 * Main API handler with retry logic and fallback
 */
export async function POST(request: NextRequest) {
  try {
    const debugFlag = request.nextUrl.searchParams.get("debug") === "1";
    const envDebug = process.env.AI_DEBUG === "true";
    const debug = debugFlag || envDebug;

    const payload = (await request.json()) as AnalyzeDayPayload;

    // Validate request
    if (!payload?.sessions || !payload?.goals || !payload?.dailyLog) {
      devLog("INVALID_REQUEST", { hasSessions: !!payload?.sessions, hasGoals: !!payload?.goals, hasDailyLog: !!payload?.dailyLog });
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    devLog("ANALYZE_REQUEST", { 
      sessionCount: payload.sessions.length,
      goalCount: payload.goals.length,
      debug 
    });

    // Try OpenAI up to 2 times
    let result = await callOpenAIOnce(payload, false);
    if (!result) {
      devLog("OPENAI_FIRST_ATTEMPT_FAILED, retrying...");
      result = await callOpenAIOnce(payload, true);
    }

    // Fallback to rule-based if both attempts fail
    if (!result) {
      if (isDev) console.warn("⚠️  OpenAI failed twice, using rule-based fallback");
      const fallbackAnalysis = await analyzeDayWithMeta(payload);
      return NextResponse.json({
        ...fallbackAnalysis.result,
        _meta: fallbackAnalysis.meta,
        ...(debug ? { _debug: { payload } } : {}),
      });
    }

    // Success - return OpenAI result
    return NextResponse.json({
      ...result,
      _meta: { source: "openai" },
      ...(debug ? { _debug: { payload } } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the day.";
    devError("API_HANDLER_EXCEPTION", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
