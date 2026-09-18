import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msdcsrxyxhdszmnqksbp.supabase.co';
const supabasePublishableKey = 'sb_publishable_5EYKMC3b5WdnKAgZz5g4sw_XQxbOKRf';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
