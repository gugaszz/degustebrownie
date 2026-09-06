import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://sttimpooffldplcjyfsk.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dGltcG9vZmZsZHBsY2p5ZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjQ1NTQsImV4cCI6MjEwNDE0MDU1NH0.K4EKvLB8x8bAxs2TVJvdFW4IPeC-YM3hDk85Jh0dwho';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const checkSupabaseConnection = async (): Promise<{ connected: boolean; message?: string }> => {
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    if (error) {
      return { connected: false, message: error.message };
    }
    return { connected: true };
  } catch (err: any) {
    return { connected: false, message: err?.message || 'Falha na conexão com Supabase' };
  }
};
