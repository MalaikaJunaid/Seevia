/**
 * SttService.js: Interface for OpenAI Whisper API.
 * Handles the transcription of Roman Urdu and English audio.
 */

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; // Secure this in a .env file later

export default class SttService {
  /**
   * Transcribes audio file from a URI into text.
   * @param {string} audioUri - The file path from AudioRecorder.js
   */
  static async transcribe(audioUri) {
    try {
      // 1. Prepare the form data for the API
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      });
      formData.append('model', 'whisper-1');
      // Setting language to 'ur' helps Whisper better understand Roman Urdu phonetics
      formData.append('language', 'ur'); 

      // 2. Execute the request
      const response = await fetch(WHISPER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Transcription Success:', data.text);
        return data.text; // e.g., "Milk kahan rakha hai?"
      } else {
        console.error('STT API Error:', data.error);
        return null;
      }
    } catch (error) {
      console.error('SttService Network Error:', error);
      return null;
    }
  }
}
