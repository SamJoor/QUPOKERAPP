// Creates the pre-verified demo account that Apple's Beta App Review needs.
//
// The whole app sits behind auth, and a reviewer cannot self-register: signup requires an
// 8-digit code emailed to an address they do not control. So the account has to exist and be
// confirmed before review. The admin API's `email_confirm: true` skips the code entirely.
//
// Inserting into auth.users fires public.handle_new_user(), which creates the profiles row
// from raw_user_meta_data->>'full_name'. The profile fields the onboarding screen would
// normally collect are patched in afterwards so the reviewer lands on the dashboard rather
// than a form.
//
// Requires a SERVICE ROLE key. That key bypasses RLS completely — it must never be named with
// an EXPO_PUBLIC_ prefix (Expo inlines those into the shipped bundle) and must never be
// committed. Put it in .env.local, which .gitignore already covers via `.env.*`.
//
// Usage:
//   node scripts/create-demo-account.mjs
//   node scripts/create-demo-account.mjs --email demo@example.com --password 'something'

import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const url = (env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL in .env");
  process.exit(1);
}
if (!serviceKey) {
  console.error(`Missing SUPABASE_SERVICE_ROLE_KEY.

Get it from the Supabase dashboard:
  Project Settings -> API -> Project API keys -> service_role -> Reveal

Then add it to .env.local (already gitignored), NOT .env:
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

Do not give it an EXPO_PUBLIC_ prefix. That would ship it inside the app bundle.`);
  process.exit(1);
}

const email = arg("email", env.DEMO_ACCOUNT_EMAIL || "qupoker.demo@gmail.com");
// Never hardcode this. The repo is public and docs/ is served by GitHub Pages, so a literal
// here would publish admin credentials for the production database.
const password = arg("password", env.DEMO_ACCOUNT_PASSWORD);
const fullName = arg("name", "App Review Demo");

if (!password) {
  console.error(`Missing demo account password.

Add it to .env.local (gitignored), or pass --password:
  DEMO_ACCOUNT_PASSWORD=...

Re-running with a different value resets the live account's password, which will
break the credentials saved in App Store Connect until you update them there too.`);
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json"
};

async function main() {
  console.log(`Creating ${email} on ${url}\n`);

  let userId;

  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
  });
  const createdBody = await created.json().catch(() => ({}));

  if (created.ok) {
    userId = createdBody.id;
    console.log(`  auth user created      ${userId}`);
    console.log(`  email confirmed        ${Boolean(createdBody.email_confirmed_at)}`);
  } else if (created.status === 422 || /already/i.test(createdBody.msg || createdBody.message || "")) {
    console.log("  auth user already exists — reusing it");
    const lookup = await fetch(
      `${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers }
    );
    const found = await lookup.json();
    const match = (found.users || []).find((u) => u.email === email);
    if (!match) {
      console.error("  could not find the existing user; delete it in the dashboard and retry");
      process.exit(1);
    }
    userId = match.id;

    // An account made through the app before SMTP was fixed may still be unconfirmed, and the
    // password is whatever was typed then. Force both to known values.
    const patched = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password, email_confirm: true, user_metadata: { full_name: fullName } })
    });
    if (!patched.ok) {
      console.error("  failed to reset password/confirmation:", await patched.text());
      process.exit(1);
    }
    console.log(`  password reset, confirmed  ${userId}`);
  } else {
    console.error(`  failed (${created.status}):`, JSON.stringify(createdBody));
    process.exit(1);
  }

  // handle_new_user() runs as an AFTER trigger in the same transaction, so the row is there.
  const profile = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      full_name: fullName,
      student_id: "DEMO0001",
      graduation_year: 2027,
      major: "Computer Science",
      role: "admin"
    })
  });

  if (!profile.ok) {
    console.error(`  profile patch failed (${profile.status}):`, await profile.text());
    process.exit(1);
  }
  const [row] = await profile.json();
  if (!row) {
    console.error("  no profiles row came back — handle_new_user may not have fired");
    process.exit(1);
  }
  console.log(`  profile role           ${row.role}`);
  console.log(`  student id             ${row.student_id}`);

  console.log(`
Paste these into App Store Connect -> TestFlight -> Test Information
-> Beta App Review Information, with "Sign-in required" turned ON:

  Username: ${email}
  Password: ${password}

Sign in with them once on a device before submitting, to be sure.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
