import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const SECURE_STORE_CHUNK_SIZE = 1800;
const metadataKey = (key: string) => `${key}.metadata`;
const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

const ExpoSecureStoreAdapter = {
  async getItem(key: string) {
    const metadata = await SecureStore.getItemAsync(metadataKey(key));
    if (!metadata) {
      return SecureStore.getItemAsync(key);
    }

    const { chunks } = JSON.parse(metadata) as { chunks: number };
    const values = await Promise.all(Array.from({ length: chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))));
    return values.every((value) => value !== null) ? values.join("") : null;
  },
  async setItem(key: string, value: string) {
    await this.removeItem(key);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE);
    await Promise.all(
      Array.from({ length: chunks }, (_, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), value.slice(index * SECURE_STORE_CHUNK_SIZE, (index + 1) * SECURE_STORE_CHUNK_SIZE))
      )
    );
    await SecureStore.setItemAsync(metadataKey(key), JSON.stringify({ chunks }));
  },
  async removeItem(key: string) {
    const metadata = await SecureStore.getItemAsync(metadataKey(key));
    if (metadata) {
      const { chunks } = JSON.parse(metadata) as { chunks: number };
      await Promise.all(Array.from({ length: chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))));
      await SecureStore.deleteItemAsync(metadataKey(key));
    }

    await SecureStore.deleteItemAsync(key);
  }
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || "https://example.supabase.co", supabaseAnonKey || "anon-key", {
  auth: {
    storage: Platform.OS === "web" ? AsyncStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
