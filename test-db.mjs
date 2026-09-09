import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing credentials");
  process.exit(1);
}

async function check() {
  console.log("Checking otp_codes table...");
  const res = await fetch(`${supabaseUrl}/rest/v1/otp_codes?select=*&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  
  if (!res.ok) {
    console.error("Error fetching:", res.status, await res.text());
  } else {
    const data = await res.json();
    console.log("Latest 5 OTPs:", data);
  }
}

check();
