import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabaseConfig.js';

// The SDK is only fetched from the CDN when actually needed (configured +
// online), so an unconfigured or offline device never attempts this
// cross-origin request — the app must keep working offline-first.
let clientPromise = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }

  return clientPromise;
}

/**
 * Returns the current user's id, signing in anonymously if there is no
 * session yet. Requires "Anonymous sign-ins" to be enabled in the Supabase
 * project's Auth settings.
 */
export async function ensureAnonymousUserId(client) {
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}
