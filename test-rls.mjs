import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing SUPABASE credentials");
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fixRLS() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE POLICY "Allow users to update their own pending enrollments"
      ON public.enrollments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id AND payment_status = 'pending')
      WITH CHECK (auth.uid() = user_id AND payment_status = 'pending');
    `
  });
  
  if (error) {
    console.log("RPC exec_sql failed, trying direct query if possible, or we will just instruct the user.", error.message);
  } else {
    console.log("Successfully added UPDATE policy!");
  }
}

fixRLS();
