import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? 'GET';
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  // Strip the base URL and query string for a concise log label
  const path = url.replace(supabaseUrl, '').split('?')[0];
  const start = Date.now();

  logger.log(`[Supabase] → ${method} ${path}`);

  return fetch(input, init).then(
    (res) => {
      const ms = Date.now() - start;
      if (res.ok) {
        logger.log(`[Supabase] ✔ ${method} ${path} ${res.status} (${ms}ms)`);
      } else {
        logger.warn(`[Supabase] ✘ ${method} ${path} ${res.status} (${ms}ms)`);
      }
      return res;
    },
    (err) => {
      const ms = Date.now() - start;
      logger.error(`[Supabase] ✖ ${method} ${path} failed (${ms}ms)`, err);
      throw err;
    }
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: supabaseFetch,
  },
});
