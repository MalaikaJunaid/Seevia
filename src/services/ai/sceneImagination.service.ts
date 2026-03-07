import { ProductRecognitionService } from './productRecognition.service';
import { TextToSpeechService } from '../voice/textToSpeech.service';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Scene Imagination Service
 * Translates visual data into spatial narratives for visually impaired users.
 */
class SceneImaginationService {
  private readonly MODULE = 'SCENE_IMAGINATION';

  /**
   * Generates a spatial description of the user's current view.
   * Migrated from proactive pipeline logic.
   */
  async imagine(imageUri: string, isCameraBlur: boolean = false): Promise<string> {
    try {
      await hapticService.selection();

      // 1. Handle hardware issues first (Proactive Guidance)
      if (isCameraBlur) {
        const guidance = "The image is a bit blurry. Try holding the phone steadier or move slightly back.";
        await TextToSpeechService.speak(guidance);
        return guidance;
      }

      // 2. Fetch raw visual labels from Recognition Service
      const labels = await ProductRecognitionService.identifyObject(imageUri);
      
      // 3. Construct Narrative (Spatial Reasoning)
      const narrative = this.constructNarrative(labels);
      
      logger.info(this.MODULE, `Scene Imagined: ${narrative}`);
      
      // 4. Narrate to user
      await TextToSpeechService.speak(narrative);
      await hapticService.success();
      
      return narrative;
    } catch (error) {
      logger.error(this.MODULE, 'Imagination failed', error);
      return "I'm having trouble seeing clearly right now. Please try again.";
    }
  }

  /**
   * Turns a list of labels into a human-readable spatial map.
   */
  private constructNarrative(labels: string[]): string {
    if (labels.length === 0) return "The area ahead seems clear, but I don't see any specific items.";

    const items = labels.slice(0, 3).join(', ');
    
    // Example logic: "I see [items]. You are likely in a grocery aisle."
    let description = `I can see ${items} in front of you. `;
    
    if (labels.includes('Shelf') || labels.includes('Aisle')) {
      description += "You appear to be in a shopping aisle. Items are stacked on your left and right.";
    }

    return description;
  }
}

export const sceneImaginationService = new SceneImaginationService();
