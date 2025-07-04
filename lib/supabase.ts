// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bpzgwwfdizcwrqypyiyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwemd3d2ZkaXpjd3JxeXB5aXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDMyNTQsImV4cCI6MjA2NzA3OTI1NH0.uQxZwjO3nUr3NDY_kkhRbsDAI3vnSVXTBGiD6xbRCqU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
