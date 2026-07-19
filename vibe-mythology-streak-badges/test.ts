import { GoogleGenAI } from "@google/genai";
async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: "AIzaSyCgnDbA5az-EAsAgfp306wIKwWIjBllL6Q" });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: "hi" }] }]
    });
    console.log(result.text);
  } catch(e: any) {
    console.error("ERROR", e.message);
  }
}
test();
