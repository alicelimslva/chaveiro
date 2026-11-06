import { createDemoApi, type KV } from './demo';
import { createSupabaseApi } from './supabase';
import type { Api } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function browserStorage(): KV {
  try {
    const k = '__t';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
}

export const storage = browserStorage();
export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi(storage);
export type { Api } from './types';
