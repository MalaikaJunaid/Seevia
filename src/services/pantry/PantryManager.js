import { db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import UsageLearner from './UsageLearner';
import ProactiveBrain from './ProactiveBrain';

export default class PantryManager {
  /**
   * Called by BarcodeService when a product is scanned.
   */
  static async handleNewScan(barcode, productDetails) {
    const itemRef = doc(db, "pantry", barcode);
    const snap = await getDoc(itemRef);

    if (snap.exists()) {
      // 1. UPDATE EXISTING ITEM
      const data = snap.data();
      const newQty = data.currentQty + 1;
      
      // AI Logic: Learn the new usage rate based on time since lastRestock
      const updatedRate = UsageLearner.trainRate(
        data.avgDailyUsage || 0.1, 
        data.lastRestock, 
        1 
      );

      // AI Logic: Predict new empty date
      const prediction = ProactiveBrain.calculateStockout(newQty, updatedRate);

      await updateDoc(itemRef, {
        currentQty: newQty,
        lastRestock: serverTimestamp(),
        avgDailyUsage: updatedRate,
        predictedEmpty: prediction.date
      });
      
      return { status: 'updated', newQty };
    } else {
      // 2. CREATE NEW ITEM (Initial Population)
      await setDoc(itemRef, {
        itemName: productDetails.name,
        currentQty: 1,
        unit: productDetails.unit || "unit",
        lastRestock: serverTimestamp(),
        avgDailyUsage: 0.2, // Default starting assumption
        allergyTags: productDetails.tags || [],
        expiryDate: null, // Will be filled by Module 4 OCR later
        predictedEmpty: null
      });
      
      return { status: 'created', newQty: 1 };
    }
  }
}
