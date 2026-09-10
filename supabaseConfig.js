// Fill these in with your own Supabase project's values
// (Project Settings > API in the Supabase dashboard).
// The anon key is safe to ship in client-side code as long as Row Level
// Security is enabled on every table (see SUPABASE_SETUP.md).
export const SUPABASE_URL = 'https://lbqgcogugovjsovdcnpd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_tXrCqJL924u001J4CPzqzA_3Sa0QoVQ';

// Public Storage bucket that observation photos are uploaded to.
export const PHOTO_BUCKET = 'observation-photos';

export function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.startsWith('http') &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.length > 0 &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
  );
}
