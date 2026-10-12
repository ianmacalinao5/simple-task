import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.OWNER_EMAIL?.trim();
const password = process.env.OWNER_PASSWORD;

if (!url || !key) {
  throw new Error('Set the Supabase URL and server secret in .env.local first.');
}

if (!email || !email.includes('@')) {
  throw new Error('Set a valid OWNER_EMAIL in .env.local first.');
}

if (!password || password.length < 12) {
  throw new Error('Set OWNER_PASSWORD to a password with at least 12 characters.');
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) throw listError;

const existingUser = listed.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

if (existingUser) {
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  process.stdout.write('Owner password set on the existing Supabase Auth account.\n');
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  process.stdout.write('Owner Supabase Auth account created.\n');
}
