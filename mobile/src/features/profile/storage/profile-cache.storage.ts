import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppProfile } from "@/src/features/profile/types";

const STORAGE_PREFIX = "@buscontrol/profile-cache:";

let memoryCache: { email: string; profile: AppProfile } | null = null;

function cacheKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

export function getMemoryCachedProfile(email: string): AppProfile | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || memoryCache?.email !== normalized) {
    return null;
  }
  return memoryCache.profile;
}

export async function loadCachedProfile(email: string): Promise<AppProfile | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const inMemory = getMemoryCachedProfile(normalized);
  if (inMemory) {
    return inMemory;
  }

  try {
    const raw = await AsyncStorage.getItem(cacheKey(normalized));
    if (!raw) {
      return null;
    }
    const profile = JSON.parse(raw) as AppProfile;
    memoryCache = { email: normalized, profile };
    return profile;
  } catch {
    return null;
  }
}

export async function saveCachedProfile(email: string, profile: AppProfile): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  memoryCache = { email: normalized, profile };

  try {
    await AsyncStorage.setItem(cacheKey(normalized), JSON.stringify(profile));
  } catch {
    /* non-fatal */
  }
}

export async function clearCachedProfile(email?: string): Promise<void> {
  if (!email) {
    memoryCache = null;
    return;
  }

  const normalized = email.trim().toLowerCase();
  if (memoryCache?.email === normalized) {
    memoryCache = null;
  }

  try {
    await AsyncStorage.removeItem(cacheKey(normalized));
  } catch {
    /* non-fatal */
  }
}
