import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log("Checking otp_codes table...");
  const { data, error } = await supabase.from('otp_codes').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.log("Error fetching:", error);
  } else {
    console.log("Latest 5 OTPs:");
    console.dir(data, { depth: null });
  }
}

check();
