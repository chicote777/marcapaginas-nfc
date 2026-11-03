import { createClient } from '@supabase/supabase-js'

// Solo se usa en el servidor (Server Components y Server Actions),
// así que las claves no llegan nunca al navegador.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)
