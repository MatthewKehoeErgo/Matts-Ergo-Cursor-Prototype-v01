// src/supabase.js

export const SUPABASE_URL = 'https://sctpnjrcluonpomdtnfp.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_cT4PL23N5w0B9bfUk1gHCg_9IE__PyV'

export async function supabaseInsert(table, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }

  return response.json()
}