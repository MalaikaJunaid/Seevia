const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export default class GeminiService {
  static async describe(base64Image) {
    const payload = {
      contents: [{
        parts: [
          { text: "Describe this Pakistani grocery item in 5 words. Identify if it matches Tapal, Milkpak, or Lays. Answer in Roman Urdu." },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return { 
      label: data.candidates[0].content.parts[0].text, 
      confidence: 1.0 // LMMs are treated as high-confidence
    };
  }
}
