import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yqwrhopleaonkrszvbsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3Job3BsZWFvbmtyc3p2YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1NDMsImV4cCI6MjA4MjUyNTU0M30.6CBNO41BnrUth3Tn10CwpOoo6nk6id4sOn_8TDqkJgc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
