import { Audio } from 'expo-av';

/**
 * Handles expo-av microphone logic for Seevia Module 2. 
 */
export default class AudioRecorder {
  constructor() {
    this.recording = null;
    this.uri = null;
  }

  // 1. Request Microphone Permissions 
  async requestPermissions() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.error('Microphone permission not granted');
      return false;
    }
    return true;
  }

  // 2. Start Recording with High-Quality Settings for STT 
  async startRecording() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      console.log('Recording started...');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  // 3. Stop Recording and Get File URI 
  async stopRecording() {
    try {
      await this.recording.stopAndUnloadAsync();
      this.uri = this.recording.getURI();
      this.recording = null;
      console.log('Recording stopped. File saved at:', this.uri);
      return this.uri; // This URI is passed to SttService.js [cite: 4]
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }
}
