import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Session tokens live in expo-secure-store only — never MMKV, never AsyncStorage
 * (CLAUDE.md non-negotiable #7).
 *
 * SecureStore has no web implementation, so on web this degrades to an in-memory
 * map. That is acceptable here because the mockup's "token" is a fake string, but
 * a real build must not ship a web fallback that pretends to be secure.
 */
const memory = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return memory.get(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      memory.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      memory.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  session: 'hamlethq.session',
} as const;
