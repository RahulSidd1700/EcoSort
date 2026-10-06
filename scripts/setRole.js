/**
 * Promote an existing account to a role (used to create the first ADMIN securely).
 *
 *   node scripts/setRole.js someone@example.com admin [--emulator]
 *   node scripts/setRole.js someone@example.com collector "Koramangala, HSR Layout" [--emulator]
 *
 * The person first registers normally in the app (role = user), then an
 * administrator with project access runs this script. No password is involved.
 */
import { args, useEmulator, db, auth, FieldValue } from './firebaseAdmin.js';

const [email, role, areas = ''] = args.filter((a) => !a.startsWith('--'));
const ROLES = ['user', 'collector', 'admin'];

async function main() {
  if (!email || !ROLES.includes(role)) {
    throw new Error('Usage: node scripts/setRole.js <email> <user|collector|admin> ["area1, area2"] [--emulator]');
  }
  const user = await auth.getUserByEmail(email);
  const userRef = db.collection('users').doc(user.uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('This account has no EcoSort profile. Ask the person to register in the app first.');

  await userRef.update({ role, updatedAt: FieldValue.serverTimestamp() });
  if (role === 'collector') {
    const profile = snap.data();
    await db.collection('collectors').doc(user.uid).set(
      {
        uid: user.uid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        serviceAreas: areas.split(',').map((a) => a.trim()).filter(Boolean),
        available: true,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  console.log(`✔ ${email} is now "${role}" (${useEmulator ? 'emulator' : 'real project'})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('✖', error.message);
    process.exit(1);
  });
