/**
 * Seevia Medicine Reminder Service
 * Polls every minute, checks medicine schedule from AsyncStorage,
 * and announces via TTS + haptics when it's time to take medicine.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { hapticService } from '@/services/common/haptic.service';
import { logger } from '@/utils/logger';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

interface MedSchedule {
  name: string;
  time: string; // "HH:MM" 24h
  notes: string;
}

const STORAGE_KEY = 'seevia_medications';
const REMINDED_KEY_PREFIX = 'seevia_med_reminded_';

class MedicineReminderService {
  private readonly MODULE = 'MED_REMINDER';
  private interval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    // Check immediately and then every 60 seconds
    this.checkSchedule();
    this.interval = setInterval(() => this.checkSchedule(), 60_000);
    logger.info(this.MODULE, 'Medicine reminder service started');
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.isRunning = false;
  }

  private async checkSchedule() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const meds: MedSchedule[] = JSON.parse(raw);
      if (!meds.length) return;

      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const todayKey = now.toDateString();

      for (const med of meds) {
        if (!med.time) continue;

        // Match within ±1 minute window
        const [mH, mM] = med.time.split(':').map(Number);
        const [cH, cM] = [now.getHours(), now.getMinutes()];
        const diffMin = Math.abs((cH * 60 + cM) - (mH * 60 + mM));
        if (diffMin > 1) continue;

        // Check we haven't already reminded today for this med+time
        const remindedKey = `${REMINDED_KEY_PREFIX}${todayKey}_${med.name}_${med.time}`;
        const alreadyReminded = await AsyncStorage.getItem(remindedKey);
        if (alreadyReminded === 'true') continue;

        // Mark as reminded
        await AsyncStorage.setItem(remindedKey, 'true');

        // Fire announcement
        const message = `Dawai yaad dihani! ${med.name} lene ka waqt ho gaya.${med.notes ? ` ${med.notes}.` : ''} Kya aapne le li?`;
        TtsService.speak(message);
        hapticService.trigger('success');
        DeviceEventEmitter.emit('MEDICINE_REMINDER', { name: med.name, time: med.time });
        logger.info(this.MODULE, `Reminder fired: ${med.name} at ${med.time}`);
      }
    } catch (e) {
      logger.error(this.MODULE, 'Error checking schedule', e);
    }
  }

  /** Mark today's medicine as taken */
  async markTaken(medName?: string) {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(`seevia_med_taken_${today}`, 'true');
    const msg = medName ? `${medName} le li. Shaabaash!` : 'Dawai le li. Shaabaash!';
    TtsService.speak(msg);
    hapticService.trigger('success');
    DeviceEventEmitter.emit('MEDICINE_TAKEN', { name: medName, date: today });
  }

  /** Check if today's meds taken */
  async isTakenToday(): Promise<boolean> {
    const today = new Date().toDateString();
    const val = await AsyncStorage.getItem(`seevia_med_taken_${today}`).catch(() => null);
    return val === 'true';
  }
}

export const medicineReminderService = new MedicineReminderService();
