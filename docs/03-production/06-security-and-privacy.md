# Security and Privacy

You're handling dues payments and residents' personal data in communities where
everyone knows each other. A leak here isn't abstract — it's your neighbour finding out
you're behind on payments.

---

## 1. The threat model

Be specific about what you're defending against.

| Threat | Likelihood | Impact | Priority |
|---|---|---|---|
| **Broken authorization** (resident sees neighbour's data) | 🔴 High | 🔴 Severe | **#1** |
| Secrets in the client bundle | 🟡 Medium | 🔴 Severe | **#2** |
| Insecure token storage | 🟡 Medium | 🟠 High | #3 |
| Payment manipulation | 🟡 Medium | 🔴 Severe | **#2** |
| Data in transit | 🟢 Low | 🔴 Severe | #4 (HTTPS handles it) |
| Reverse engineering the app | 🟢 High | 🟢 Low | #5 |
| Device theft | 🟡 Medium | 🟠 High | #4 |

**The top risk is not exotic.** It's a missing `where` clause in an RLS policy. Broken
access control is consistently the most common serious vulnerability in real
applications, and it's silent — nothing crashes, nothing errors, the data just flows to
the wrong person.

**Assume the client is hostile.** Anyone can download your app, extract the bundle, read
every string, and call your API with arbitrary payloads. Everything that matters is
enforced server-side.

---

## 2. Secrets

### The three tiers

| Tier | Example | Where | Public? |
|---|---|---|---|
| **Public config** | Supabase URL, anon key, Stripe publishable key | `EXPO_PUBLIC_*` | ✅ Yes, by design |
| **Build secrets** | Sentry auth token, Play service account | EAS secrets | ❌ Never in the app |
| **Runtime secrets** | Stripe secret key, Supabase service role key | Edge Function env | ❌ Never in the app |

```bash
# Verify what's actually in your bundle
npx expo export --platform ios
grep -r "sk_live\|service_role\|SECRET" dist/ && echo "🔴 LEAK" || echo "✅ clean"
```

**Run that as a CI step.** It's five seconds and it catches the mistake that ends
companies.

```yaml
- name: Check for leaked secrets
  run: |
    npx expo export --platform ios --output-dir /tmp/bundle
    if grep -rE "sk_live_|service_role|-----BEGIN" /tmp/bundle; then
      echo "::error::Secret found in bundle"
      exit 1
    fi
```

### Why the Supabase anon key is safe

It's *designed* to be public. It identifies your project and grants nothing on its own —
**RLS is what protects the data.** If your RLS is correct, the anon key is harmless. If
your RLS is wrong, hiding the key wouldn't save you.

> 🔴 The **service role key** bypasses RLS entirely. It must never appear in the mobile
> app, in a `EXPO_PUBLIC_*` variable, or in any client-side code. Edge Functions only.

---

## 3. Token storage

```ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: secureStorage,          // ← not AsyncStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

| Storage | Encrypted | Use for |
|---|---|---|
| **expo-secure-store** | ✅ Keychain / Keystore | **Tokens, secrets** |
| react-native-mmkv | ❌ (optionally) | Preferences, cache |
| AsyncStorage | ❌ Plaintext | Non-sensitive only |

`WHEN_UNLOCKED_THIS_DEVICE_ONLY` means the token isn't included in iCloud backups and
isn't readable while the device is locked. Right default for auth tokens.

**On sign-out, clear everything:**

```ts
async function signOut() {
  await supabase.from('push_tokens').delete().eq('token', currentPushToken);
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync('supabase.auth.token');
  queryClient.clear();                  // ← clears cached data
  mmkv.clearAll();
  router.replace('/sign-in');
}
```

Forgetting `queryClient.clear()` means the next user on that device sees the previous
user's cached reservations. That's a real leak and it's easy to miss.

---

## 4. Authorization

> 🔴 **The most important section in this document.**

### The rule

**Every authorization decision is enforced server-side.** Client-side checks are UI
convenience only.

```tsx
// ❌ This is presentation, not security
{membership.role === 'board_member' && <PublishBroadcastButton />}

// The API can be called directly:
// curl -X POST .../broadcasts -H "Authorization: Bearer <any-resident-token>"
```

```sql
-- ✅ This is security
create policy broadcasts_write on broadcasts for all
using (community_id in (select my_managed_communities()))
with check (community_id in (select my_managed_communities()));
```

Do both — hide the button *and* enforce the policy. But never mistake the first for the
second.

### RLS discipline

1. **Enable RLS on every table.** A table without RLS in a Supabase project is
   world-readable to anyone with the anon key.
2. **Default deny.** No policy = no access. Add policies deliberately.
3. **Every policy checks tenancy.** `community_id in (select my_communities())`.
4. **Separate policies per operation.** Select, insert, update, delete have different
   rules.
5. **`with check` on writes**, or a user can update a row *into* another tenant.
6. **Test every policy from every role.**

```sql
-- Catch tables you forgot
select tablename
from pg_tables
where schemaname = 'public'
  and tablename not in (
    select tablename from pg_tables t
    join pg_class c on c.relname = t.tablename
    where c.relrowsecurity = true
  );
```

Run that in CI. Any row returned is a table anyone can read.

### The `with check` trap

```sql
-- ❌ Incomplete — user can move a row to another community
create policy update_reservations on reservations for update
using (community_id in (select my_communities()));

-- ✅ using = which rows you may read to update
--    with check = what the row may look like after
create policy update_reservations on reservations for update
using      (community_id in (select my_communities()))
with check (community_id in (select my_communities()));
```

Without `with check`, a user can update their own reservation and set
`community_id` to a different community — writing data into someone else's tenant.
Subtle, and a genuine exploit.

---

## 5. Input validation

Validate at every trust boundary, with Zod:

```ts
const createBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  severity: z.enum(['info', 'important', 'urgent']),
  audience: audienceSchema,
});

// In the Edge Function — before anything else
const parsed = createBroadcastSchema.safeParse(await req.json());
if (!parsed.success) {
  return json({ error: 'invalid_input', issues: parsed.error.issues }, 400);
}
```

**Client validation is UX. Server validation is security.** Same schema, two purposes.

**Watch for these specifically:**

| Risk | Mitigation |
|---|---|
| SQL injection | Supabase client parameterizes. Never string-concatenate SQL in Postgres functions. |
| XSS in user content | React Native doesn't execute HTML, but a WebView does. Sanitize anything rendered in one. |
| Path traversal in uploads | Generate storage paths server-side; never trust a client filename |
| Oversized uploads | Enforce a size limit in the Storage policy |
| Mass assignment | Explicit field allowlists, never spread a client object into an update |

```ts
// ❌ mass assignment — client can set status, fee_cents, community_id…
await supabase.from('reservations').update({ ...req.body }).eq('id', id);

// ✅ explicit
await supabase.from('reservations').update({ notes: parsed.data.notes }).eq('id', id);
```

---

## 6. Payment security

Covered fully in [payments](../06-hamlet-hq/04-payments.md). The security-critical
subset:

```
□ Amounts computed server-side, never accepted from the client
□ Stripe webhook signatures verified — always
□ Idempotency keys on every money operation
□ No card data ever touches your servers or database
□ Refunds restricted to board+ roles, enforced in RLS
□ Every money movement writes an immutable ledger entry
□ Stripe secret key only in Edge Functions
□ Live keys guarded against non-production builds
```

---

## 7. Privacy

### Collect less

The best protection for data is not having it.

| Do you need | Really? |
|---|---|
| Precise GPS | Coarse is usually enough |
| Full date of birth | Age range, if anything |
| Contacts access | Almost certainly not |
| Photo library (full) | Use the picker — it returns one photo without library access |
| Background location | Almost certainly not — and it invites App Store scrutiny |

Every field you don't collect is a field that can't leak, doesn't need a privacy
disclosure, and doesn't need deletion handling.

### The neighbour boundary

This is the privacy rule specific to your product:

> **A resident must never see another resident's payment status, balance, or
> delinquency.**

In a 200-unit community where people see each other at the mailbox, this isn't
theoretical harm. Getting it wrong is the kind of incident that ends adoption in that
community permanently — and word travels between HOA boards.

Concretely:
- Payment and assessment queries filter to `my_unit()`
- Delinquency reports are board-only
- Reservation lists show "Booked" to others, never who booked it (unless the community
  opts into a visible calendar)
- The directory is **opt-in**, per resident, per field
- Broadcast read receipts are aggregate only

### Screenshot protection

iOS snapshots your app when backgrounding it, for the app switcher. That snapshot can
contain payment amounts.

```tsx
function usePrivacyScreen() {
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setObscured(state !== 'active');
    });
    return () => sub.remove();
  }, []);

  return obscured;
}

// On payment screens
{obscured && <BlurView intensity={60} className="absolute inset-0" tint="dark" />}
```

On Android, `FLAG_SECURE` prevents screenshots entirely on sensitive screens — worth
considering for the payments section.

### Data subject rights

Users can request their data or its deletion. Build this before someone asks:

```ts
// Export — required in some jurisdictions, good practice everywhere
async function exportMyData(profileId: string) {
  return {
    profile: await getProfile(profileId),
    memberships: await getMemberships(profileId),
    reservations: await getReservations(profileId),
    payments: await getPayments(profileId),
    broadcasts_read: await getReadReceipts(profileId),
  };
}
```

Deletion is nuanced — see
[shipping to stores § account deletion](./04-shipping-to-stores.md#3-privacy-disclosures).
Anonymize the person, retain the unlinked financial records.

---

## 8. Network security

HTTPS everywhere is the default and Expo enforces it. Additional considerations:

**Certificate pinning** — pins your server's certificate so a compromised CA or a
proxy can't intercept traffic.

Worth it? For most apps, no — it breaks when you rotate certificates and causes
outages. For a payments app, consider it *after* you have a reliable release process,
and always with a remote kill switch.

**Never disable certificate validation**, even in development. It's the kind of thing
that ships accidentally.

---

## 9. Dependency security

```bash
pnpm audit
npx expo-doctor
```

In CI:

```yaml
- run: pnpm audit --audit-level high
```

**Supply chain is a real risk in the npm ecosystem.** Practical mitigations:

- Commit your lockfile; use `--frozen-lockfile` in CI
- Enable Dependabot, but **review updates** rather than auto-merging
- Prefer fewer, well-maintained dependencies
- Be suspicious of packages with very few downloads and recent publish dates
- **Verify any package an AI suggests** — `npm view <pkg> version time.modified`

That last one is worth repeating here as a security concern, not just a correctness
one: a hallucinated package name is a slot an attacker can register.

---

## 10. Security checklist

```
SECRETS
□ No secrets in the client bundle (CI-verified)
□ Service role key only in Edge Functions
□ Stripe secret key only in Edge Functions
□ Live-key guard for non-production builds
□ EAS secrets for build-time credentials

AUTH
□ Tokens in expo-secure-store, never MMKV/AsyncStorage
□ Session cleared completely on sign-out (including query cache)
□ Push token deleted on sign-out
□ Token refresh handled
□ Biometric gate optional, gating stored tokens not server auth

AUTHORIZATION
□ RLS enabled on EVERY table (CI-verified)
□ Default deny
□ Every policy checks community tenancy
□ with check on every write policy
□ Automated tests for every policy from every role
□ Cross-tenant access tested and proven impossible

INPUT
□ Zod validation server-side on every mutation
□ No mass assignment — explicit field allowlists
□ Upload paths generated server-side
□ Size limits on uploads

PAYMENTS
□ Amounts server-computed
□ Webhook signatures verified
□ Idempotency keys everywhere
□ No card data stored

PRIVACY
□ Minimal data collection
□ Neighbour boundary enforced and tested
□ Directory opt-in
□ Privacy screen on payment views
□ Account deletion works, financial records anonymized not deleted
□ Privacy policy accurate and current

DEPENDENCIES
□ pnpm audit in CI
□ Lockfile committed, frozen in CI
□ AI-suggested packages verified before install
```

---

## Check yourself

1. Why is the Supabase anon key safe to ship, and what makes that true?
2. What breaks if you omit `with check` on an update policy?
3. Why must `queryClient.clear()` run on sign-out?
4. What's the specific privacy boundary that matters most in an HOA product?
5. Why is verifying AI-suggested packages a security issue, not just correctness?

<details>
<summary>Answers</summary>

1. It grants no access by itself — it only identifies the project. RLS policies are what
   authorize every query. That's only true if RLS is actually enabled and correct on
   every table; a table without RLS is readable by anyone holding the anon key.
2. A user can update a row they legitimately own and change its `community_id`,
   effectively writing data into another tenant. `using` controls which rows you may
   modify; `with check` controls what they may become.
3. Otherwise the next user to sign in on that device sees the previous user's cached
   reservations, payments, and broadcasts from the TanStack Query cache.
4. A resident must never see another resident's payment status, balance, or
   delinquency. In a community where everyone knows each other, that exposure is
   personal and irreversible.
5. A hallucinated package name is an unregistered npm name that an attacker can claim
   and publish malicious code to — a known attack pattern. Verifying the package exists
   and has history protects against installing something someone squatted.

</details>

---

## Sources

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

**Next:** [Performance playbook →](./07-performance-playbook.md)
