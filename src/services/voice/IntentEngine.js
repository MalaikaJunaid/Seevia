// This file connects your Frontend to your Hugging Face API
const HF_API_URL = "https://api-inference.huggingface.co/models/malaikajunaid/seevia-intent-distilbert";
const HF_TOKEN = "your_hugging_face_token";

export const get_intent = async (text) => {
  const response = await fetch(HF_API_URL, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    method: "POST",
    body: JSON.stringify({ inputs: text }),
  });
  const result = await response.json();
  
  // Predict: Returns the top intent with the highest score
  return result[0]; 
};
