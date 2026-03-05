import { db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from "firebase/firestore";

export default class PantryManager {
  static async updateStock(itemId, quantityChange) {
    const itemRef = doc(db, "pantry", itemId);
    const snap = await getDoc(itemRef);
    
    if (snap.exists()) {
      const newQty = snap.data().quantity + quantityChange;
      await updateDoc(itemRef, { 
        quantity: newQty,
        lastUpdated: new Date()
      });
      return newQty;
    }
  }
}
