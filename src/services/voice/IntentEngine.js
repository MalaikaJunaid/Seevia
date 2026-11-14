// This file connects your Frontend to your Hugging Face API
const HF_API_URL = "https://api-inference.huggingface.co/models/malaikajunaid/seevia-intent-distilbert";
const HF_TOKEN = "your_hugging_face_token";

export default class IntentEngine {
  /**
   * Classifies text into one of the 9 Seevia intents.
   * @param {string} text - The transcribed bilingual text from SttService.
   */
  static async classify(text) {
    try {
      console.log('Classifying intent for:', text);

      const response = await fetch(HF_API_URL, {
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      });

      const result = await response.json();

      if (response.ok && result.length > 0) {
        // Find the result with the highest confidence score
        const topIntent = result[0].reduce((prev, current) => 
          (prev.score > current.score) ? prev : current
        );
        
        console.log('Predicted Intent:', topIntent.label, 'Score:', topIntent.score);
        return topIntent; // Returns { label: "start_navigation", score: 0.95 }
      } else {
        console.error('Inference API Error:', result);
        return null;
      }
    } catch (error) {
      console.error('IntentEngine Network Error:', error);
      return null;
    }
  }
}
