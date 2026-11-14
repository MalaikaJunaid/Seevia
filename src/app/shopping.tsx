/**
 * Seevia Shopping Screen (Root-level redirect)
 * This file forwards to the proper tabs shopping screen.
 * The fully-functional shopping UI lives at src/app/(tabs)/shopping.tsx
 */
import { Redirect } from 'expo-router';

export default function ShoppingScreenRedirect() {
  return <Redirect href="/(tabs)/shopping" />;
}
