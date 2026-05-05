#!/usr/bin/env node

// Simple Gemini API test script
const API_KEY = "AIzaSyB0Gk0GsFojv8y6yf4pExzxMwCQZjwBhJo";

async function testGemini() {
  console.log("🧪 Testing Gemini API...\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(API_KEY)}`;
  
  console.log("📍 Endpoint:", url.split("?")[0]);
  console.log("🔑 API Key (first 20 chars):", API_KEY.substring(0, 20) + "...");
  console.log("");

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Say 'Hello from Gemini!' in JSON format with key 'message'." }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    },
  };

  try {
    console.log("📤 Sending request...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ERROR RESPONSE:");
      console.error(errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error("\n🔍 Parsed Error:");
        console.error(JSON.stringify(errorJson, null, 2));
      } catch {}
      return;
    }

    const data = await response.json();
    console.log("✅ SUCCESS!");
    console.log("\n📋 Full Response:");
    console.log(JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log("\n🎯 Extracted Text:");
      console.log(text);
    }
  } catch (error) {
    console.error("💥 FETCH ERROR:", error.message);
  }
}

testGemini();
