import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://yqwrhopleaonkrszvbsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3Job3BsZWFvbmtyc3p2YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1NDMsImV4cCI6MjA4MjUyNTU0M30.6CBNO41BnrUth3Tn10CwpOoo6nk6id4sOn_8TDqkJgc'
)

async function main() {
  const { data } = await sb.from('tja7_constructions').select('id, title, phase, progress')
  console.log(JSON.stringify(data, null, 2))
}

main()
