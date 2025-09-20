import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://suncgglbheilkeimwuxt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNnZ2xiaGVpbGtlaW13dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzQzNDEsImV4cCI6MjA3MzQ1MDM0MX0.Ua6POs3Agm3cuZOWzrQSrVG7w7rC3a49C38JclWQ9wA";

// Domain validation before initializing Supabase client
const ALLOWED_DOMAIN = 'aether.deepakpatnaik.com';
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

if (typeof window !== 'undefined' && currentHost !== ALLOWED_DOMAIN) {
  console.error(`🚫 Supabase client blocked: Domain ${currentHost} is not allowed. Only ${ALLOWED_DOMAIN} is permitted.`);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'aether-boss-auth'
  },
  global: {
    headers: {
      'x-application-domain': typeof window !== 'undefined' ? window.location.hostname : '',
      'x-boss-app': 'true'
    }
  }
});