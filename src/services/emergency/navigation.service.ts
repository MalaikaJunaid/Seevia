/**
 * Seevia Navigation Service
 * Fetches real routes from Google Maps Directions API.
 * Parses each turn-by-turn step into Roman Urdu voice guidance.
 * User stays inside Seevia — no external app needed.
 */

import { logger } from '@/utils/logger';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

export interface NavStep {
  id: string;
  urdu: string;
  distanceM: number;
  distanceText: string;
  durationText: string;
  maneuver: string; // 'turn-left' | 'turn-right' | 'straight' | 'arrive'
  rawHtml: string;
}

export interface NavRoute {
  summary: string;
  totalDistanceM: number;
  totalDistanceText: string;
  totalDurationText: string;
  steps: NavStep[];
  origin: string;
  destination: string;
}

// Converts Google HTML step instructions to concise Roman Urdu
function htmlToUrdu(html: string, maneuver: string, distText: string): string {
  // Strip HTML tags
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  // Maneuver-based translations
  if (maneuver.includes('turn-left'))  return `${distText} chalein, phir LEFT mudein.`;
  if (maneuver.includes('turn-right')) return `${distText} chalein, phir RIGHT mudein.`;
  if (maneuver.includes('uturn'))      return `Yahan U-turn lein.`;
  if (maneuver.includes('roundabout')) return `Roundabout par seedha jayein.`;
  if (maneuver.includes('merge'))      return `${distText} mein road mein merge ho jayein.`;
  if (maneuver.includes('ramp'))       return `Ramp lein.`;
  if (maneuver.includes('arrive'))     return `Aap pahunch gaye hain! Destination yahan hai.`;
  if (maneuver.includes('fork-left'))  return `Fork par left jayein.`;
  if (maneuver.includes('fork-right')) return `Fork par right jayein.`;

  // Keyword-based fallback
  if (text.includes('left'))           return `${distText} mein left mudein.`;
  if (text.includes('right'))          return `${distText} mein right mudein.`;
  if (text.includes('straight') || text.includes('continue')) return `${distText} seedha chalein.`;
  if (text.includes('destination'))    return `Aap pahunch gaye hain!`;

  // Generic fallback
  return `${distText} chalein — ${text.slice(0, 60)}.`;
}

class NavigationService {
  private readonly MODULE = 'NAV_SERVICE';
  // Uses Google Cloud API key from .env
  private readonly API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY || '';

  /**
   * Fetch route from user's current GPS location to destination.
   * Falls back to text-based mock if API unavailable.
   */
  async getRoute(originCoords: { lat: number; lng: number }, destination: string): Promise<NavRoute | null> {
    if (!this.API_KEY) {
      logger.warn(this.MODULE, 'No Google API key — using mock route');
      return this.mockRoute(destination);
    }

    try {
      const dest = encodeURIComponent(destination + ', Islamabad, Pakistan');
      const orig = `${originCoords.lat},${originCoords.lng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig}&destination=${dest}&mode=walking&language=en&key=${this.API_KEY}`;

      logger.info(this.MODULE, `Fetching route to: ${destination}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.status !== 'OK' || !data.routes?.length) {
        logger.warn(this.MODULE, `Directions API: ${data.status}`);
        return this.mockRoute(destination);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      const steps: NavStep[] = leg.steps.map((s: any, i: number) => ({
        id: String(i),
        urdu: htmlToUrdu(s.html_instructions, s.maneuver || '', s.distance?.text || ''),
        distanceM: s.distance?.value || 0,
        distanceText: s.distance?.text || '',
        durationText: s.duration?.text || '',
        maneuver: s.maneuver || 'straight',
        rawHtml: s.html_instructions,
      }));

      return {
        summary: route.summary || destination,
        totalDistanceM: leg.distance?.value || 0,
        totalDistanceText: leg.distance?.text || '',
        totalDurationText: leg.duration?.text || '',
        steps,
        origin: leg.start_address || 'Aapki current location',
        destination: leg.end_address || destination,
      };
    } catch (e) {
      logger.error(this.MODULE, 'Directions API failed', e);
      return this.mockRoute(destination);
    }
  }

  /** Demo-safe fallback when GPS or API unavailable */
  private mockRoute(destination: string): NavRoute {
    return {
      summary: destination,
      totalDistanceM: 1200,
      totalDistanceText: '1.2 km',
      totalDurationText: '15 min',
      origin: 'Aapki current location',
      destination,
      steps: [
        { id: '0', urdu: 'Darwaze se bahar niklen aur seedha chalein.', distanceM: 200, distanceText: '200 m', durationText: '3 min', maneuver: 'straight', rawHtml: '' },
        { id: '1', urdu: '150 meter mein right mudein.', distanceM: 150, distanceText: '150 m', durationText: '2 min', maneuver: 'turn-right', rawHtml: '' },
        { id: '2', urdu: 'Seedha 400 meter chalein. Raste mein roundabout aayega.', distanceM: 400, distanceText: '400 m', durationText: '5 min', maneuver: 'straight', rawHtml: '' },
        { id: '3', urdu: `${destination} aapki LEFT side par hai. Pahunch gaye!`, distanceM: 0, distanceText: 'Arrived', durationText: '0 min', maneuver: 'arrive', rawHtml: '' },
      ],
    };
  }

  /**
   * Announce a step aloud in Roman Urdu.
   * Includes distance hint before the maneuver.
   */
  announceStep(step: NavStep) {
    TtsService.speak(step.urdu);
    logger.info(this.MODULE, `Announced: ${step.urdu}`);
  }

  /**
   * Format full route summary for TTS
   */
  announceRouteSummary(route: NavRoute) {
    TtsService.speak(
      `Rasta mil gaya. ${route.destination} tak ${route.totalDistanceText} aur takriban ${route.totalDurationText} lagenge. ${route.steps.length} steps hain. Pehla qadam: ${route.steps[0]?.urdu}`
    );
  }
}

export const navigationService = new NavigationService();
