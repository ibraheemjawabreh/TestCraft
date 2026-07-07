import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gpqebvkpvdrcqvucbjgr.supabase.co'
const supabaseKey = 'sb_publishable_NDyUjJhFVHAjYM-A4OM_Fw_LYq-j3QV'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBuckets() {
  const { data, error } = await supabase.storage.getBuckets()
  if (error) {
    console.error('Error fetching buckets:', error)
  } else {
    console.log('Buckets:', data.map(b => b.name))
  }
}

checkBuckets()
