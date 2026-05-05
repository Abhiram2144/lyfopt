#!/usr/bin/env node

// List available Gemini models
const API_KEY = "AIzaSyB0Gk0GsFojv8y6yf4pExzxMwCQZjwBhJo";

async function listModels() {
  console.log("📋 Listing available Gemini models...\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(API_KEY)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-goog-api-key": API_KEY,
      },
    });

    console.log(`Response Status: ${response.status}`);

    const data = await response.json();
    
    if (data.models) {
      console.log(`\n✅ Found ${data.models.length} models:\n`);
      data.models.forEach((model) => {
        console.log(`  • ${model.name}`);
        console.log(`    Display: ${model.displayName}`);
        if (model.supportedGenerationMethods) {
          console.log(`    Methods: ${model.supportedGenerationMethods.join(", ")}`);
        }
        console.log("");
      });
    } else {
      console.log("\n📊 Full response:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

listModels();
