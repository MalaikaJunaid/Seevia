import { PantryItem } from '@/models/PantryItem';
import { getExpiryStatus } from '@/utils/expiry';
import HealthGuard from '@/services/pantry/HealthGuard';
import { dietaryPreferencesService } from '@/services/pantry/dietary-preferences.service';
import { logger } from '@/utils/logger';
import { API_KEYS } from '@/constants/config';
// @ts-ignore
import TtsService from '../voice/TtsService';

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  category: string;
  prepTime: number;
  allergyTags: string[]; 
  score?: number;
  isUnsafe?: boolean;
}

class RecipeServiceImpl {
  private readonly MODULE = 'RECIPE_SERVICE';
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  /**
   * Ranks and filters recipes based on inventory, AI metrics, and HealthGuard safety.
   */
  async generateRecommendations(pantry: PantryItem[], allRecipes: Recipe[], userId: string): Promise<Recipe[]> {
    logger.info(this.MODULE, `Generating recommendations for ${allRecipes.length} recipes.`);

    // We use Promise.all because HealthGuard is an async background check
    const rankedPromises = allRecipes.map(async (recipe) => {
      
      // 1. HARD-BLOCK CHECK: Health Guard Safety 
      // Powered by the Groq LLM we set up earlier
      const safety = await HealthGuard.validateSafety(userId, { 
        product_name: recipe.title, 
        allergy_tags: recipe.allergyTags 
      });

      if (!safety.isSafe) return { ...recipe, score: 0, isUnsafe: true };

      // 2. SCORING LOGIC (Inventory & AI Metrics)
      let score = 0;
      recipe.ingredients.forEach(ing => {
        const matchingItem = pantry.find(p => p.name.toLowerCase().includes(ing.toLowerCase()));
        
        if (matchingItem) {
          score += 20; // Ingredient in stock
          
          // 🛠️ FIX: Added || undefined fallback here to satisfy strict TypeScript rules
          const expiry = getExpiryStatus(matchingItem.expiryDate || undefined);
          if (expiry.status === 'warning') score += 50; // Anti-waste bonus
        } else {
          score -= 10; // Requires purchase penalty
        }
      });

      return { ...recipe, score, isUnsafe: false };
    });

    const resolvedRecipes = await Promise.all(rankedPromises);

    // Filter out unsafe/unviable recipes and sort by highest score
    return resolvedRecipes
      .filter(r => r.score! > 0 && !r.isUnsafe)
      .sort((a, b) => b.score! - a.score!);
  }

  /**
   * 👩‍🍳 THE DEMO CHEAT CODE: Generative AI Chef
   * If the user asks for a recipe to save their expiring items, this generates one dynamically
   * in spoken Roman Urdu, strictly avoiding their registered allergens.
   */
  async suggestDynamicRecipeForVoice(userId: string, expiringItems: PantryItem[]): Promise<void> {
    try {
      if (expiringItems.length === 0) {
        TtsService.speak("Aapke paas filhal koi item expire nahi ho raha. Aap kuch bhi paka sakte hain.");
        return;
      }

      TtsService.speak("Main aapke expiring items ke hisaab se ek recipe soch rahi hoon. Ek second.");

      const itemNames = expiringItems.map(i => i.nameUr || i.name).join(', ');
      
      // Fetch exact user allergies so the AI doesn't accidentally kill them
      const profile = await dietaryPreferencesService.getPreferences(userId);
      const allergies = profile.allergies.length > 0 ? profile.allergies.join(', ') : 'none';

      const prompt = `You are a helpful culinary AI for a visually impaired user in Pakistan. 
      The user needs to cook something to prevent food waste.
      They have these items expiring very soon: ${itemNames}.
      CRITICAL SAFETY: The user is allergic to: ${allergies}. DO NOT include these in the recipe.
      
      Suggest ONE simple, quick recipe they can make using these expiring items.
      Keep the response conversational, friendly, and in Roman Urdu.
      Strictly keep it under 3 or 4 sentences so it's easy to listen to.
      
      Respond ONLY with a JSON object matching this schema:
      {"recipeName": "Short name in Roman Urdu", "spokenInstructions": "The 3-sentence spoken recipe"}`;

      const response = await fetch(RecipeServiceImpl.GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.3, // Low temp for reliable, safe recipes
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
      
      const data = await response.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      if (result.spokenInstructions) {
        logger.info(this.MODULE, `Generated AI Recipe: ${result.recipeName}`);
        TtsService.speak(`Aap ${result.recipeName} bana sakte hain. ${result.spokenInstructions}`);
      } else {
        throw new Error("Invalid format from AI");
      }

    } catch (error) {
      logger.error(this.MODULE, 'Failed to generate dynamic recipe', error);
      TtsService.speak("Maazrat, main is waqt nayi recipe nahi soch paa rahi. Thodi der baad try karein.");
    }
  }
}

export const recipeService = new RecipeServiceImpl();