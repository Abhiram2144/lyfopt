import { NextResponse, type NextRequest } from "next/server";
import { analyzeDayWithMeta, buildPrompt, extractJson, type AnalyzeDayPayload, type AnalyzeDayResult, normalizeResult } from "@/lib/ai";

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
 * Call Gemini API once with error handling and detailed logging
 */
async function callGeminiOnce(
  payload: AnalyzeDayPayload,
  isRetry: boolean = false
): Promise<AnalyzeDayResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Validate API key early
  if (!apiKey) {
    if (isDev) throw new Error("GEMINI_API_KEY is not configured in environment");
    devLog("GEMINI_API_KEY missing, falling back to rule-based");
    return null;
  }

  const prompt = buildPrompt(payload, isRetry);
  devLog("GEMINI_PROMPT_SENT", { isRetry, promptLength: prompt.length });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower for more consistent JSON
            topP: 0.9,
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_UNSPECIFIED",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      devError(`GEMINI_HTTP_ERROR: ${response.status}`, errorText);
      return null;
    }

    const json = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message: string };
    };

    if (json.error) {
      devError("GEMINI_API_ERROR", json.error.message);
      return null;
    }

    if (!json.candidates?.[0]) {
      devError("GEMINI_NO_CANDIDATES", "Empty response from Gemini");
      return null;
    }

    const rawText = json.candidates[0].content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";

    devLog("GEMINI_RAW_RESPONSE", { 
      finishReason: json.candidates[0].finishReason,
      textLength: rawText.length 
    });

    if (!rawText.trim()) {
      devError("GEMINI_EMPTY_TEXT", "No text in response");
      return null;
    }

    // Extract JSON with enhanced parsing
    const extractedJson = extractJson(rawText);
    if (!extractedJson) {
      devError("GEMINI_JSON_EXTRACTION_FAILED", rawText.slice(0, 200));
      return null;
    }

    devLog("GEMINI_JSON_EXTRACTED", { jsonLength: extractedJson.length });

    // Parse and normalize
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractedJson);
      devLog("GEMINI_JSON_PARSED", "Success");
    } catch (parseError) {
      devError("GEMINI_JSON_PARSE_ERROR", parseError);
      return null;
    }

    const normalized = normalizeResult(parsed);
    if (!normalized) {
      devError("GEMINI_NORMALIZATION_FAILED", parsed);
      return null;
    }

    devLog("GEMINI_SUCCESS", "Analysis complete");
    return normalized;
  } catch (error) {
    devError("GEMINI_CALL_EXCEPTION", error);
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

    // Try Gemini up to 2 times
    let result = await callGeminiOnce(payload, false);
    if (!result) {
      devLog("GEMINI_FIRST_ATTEMPT_FAILED, retrying...");
      result = await callGeminiOnce(payload, true);
    }

    // Fallback to rule-based if both attempts fail
    if (!result) {
      if (isDev) console.warn("⚠️  Gemini failed twice, using rule-based fallback");
      const fallbackAnalysis = await analyzeDayWithMeta(payload);
      return NextResponse.json({
        ...fallbackAnalysis.result,
        _meta: fallbackAnalysis.meta,
        ...(debug ? { _debug: { payload } } : {}),
      });
    }

    // Success - return Gemini result
    return NextResponse.json({
      ...result,
      _meta: { source: "gemini" },
      ...(debug ? { _debug: { payload } } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the day.";
    devError("API_HANDLER_EXCEPTION", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
