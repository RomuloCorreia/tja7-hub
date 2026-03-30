import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yqwrhopleaonkrszvbsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3Job3BsZWFvbmtyc3p2YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NjE1OTcsImV4cCI6MjA1ODQzNzU5N30.jM20KdjSqsNjCJQ-1OVxjgCf6LSS9dBfZKlcnwBRbv4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
