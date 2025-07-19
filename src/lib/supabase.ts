
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gsmcxfuaerrhjqpptduw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWN4ZnVhZXJyaGpxcHB0ZHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NTI3NjgsImV4cCI6MjA2ODUyODc2OH0.7w-EKBT18wnIsN9_4ELchEjszmlhsniP2kt_bPMmfs0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
