/**
 * StadiaSync — One-time Admin Account Setup
 * Run: node scripts/setup-admin.mjs <SERVICE_ROLE_KEY>
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zrhztjrkshgddkhmnjeo.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2]; // Pass as CLI argument

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Usage: node scripts/setup-admin.mjs <YOUR_SERVICE_ROLE_KEY>');
  console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '123123';

async function setupAdmin() {
  console.log('🔧 Setting up StadiaSync admin account...');

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

  let userId;

  if (existing) {
    console.log(`ℹ️  User ${ADMIN_EMAIL} already exists. Updating role...`);
    userId = existing.id;

    // Update password and metadata
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      user_metadata: { role: 'admin', full_name: 'StadiaSync Admin' },
      email_confirm: true,
    });

    if (error) {
      console.error('❌ Failed to update user:', error.message);
      process.exit(1);
    }

    console.log('✅ Admin user updated successfully!');
  } else {
    // 2. Create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Skip email verification
      user_metadata: { role: 'admin', full_name: 'StadiaSync Admin' },
    });

    if (error) {
      console.error('❌ Failed to create admin user:', error.message);
      process.exit(1);
    }

    userId = data.user.id;
    console.log('✅ Admin user created!');
  }

  // 3. Ensure user profile row exists in public.users
  const { error: profileError } = await supabase.from('users').upsert({
    id: userId,
    email: ADMIN_EMAIL,
    display_name: 'StadiaSync Admin',
    onboarded: true,
  });

  if (profileError) {
    console.warn('⚠️  Could not upsert user profile (non-fatal):', profileError.message);
  }

  console.log('\n🎉 Admin setup complete!');
  console.log('   Email:    admin@gmail.com');
  console.log('   Password: 123123');
  console.log('   Role:     admin');
  console.log('\n   Login at your app → Profile → "Staff Command Center" will appear.');
}

setupAdmin();
