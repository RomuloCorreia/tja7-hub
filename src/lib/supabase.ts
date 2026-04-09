import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrevomkhivtbgxrqhyke.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZXZvbWtoaXZ0Ymd4cnFoeWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Njc1OTYsImV4cCI6MjA5MTI0MzU5Nn0.0RxG_aiqC7vkGiA1xTzUgc9W3Jv1yP3N1W5H1gtD87E'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
