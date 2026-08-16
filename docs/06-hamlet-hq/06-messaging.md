# Hamlet HQ — Messaging

Broadcasts, push notifications, and the delivery guarantees you can and cannot make.

---

## 1. The core principle

> **Push notifications are a hint that something happened. They are never the message.**

Push delivery is best-effort at every layer:

- APNs and FCM make no delivery guarantee
- OEM battery managers (Samsung, Xiaomi, OnePlus, Huawei) delay or drop notifications
- Users disable notifications, or never grant permission
- The device may be off, offline, or out of storage
- Tokens rotate and go stale
- Your app may be force-quit (which on Android stops delivery entirely on some OEMs)

**Therefore:** every broadcast is a **row in your database**, readable in the app's
announcement feed. Push is an accelerator that gets it seen sooner.

If a board sends "Water shut off tomorrow 9am–3pm" and a resident misses it because
their Samsung throttled the notification, that's a real-world problem for a real person.
The in-app feed is the guarantee; push is the courtesy.

---

## 2. Broadcast lifecycle

```
draft ──▶ scheduled ──▶ published ──▶ archived
  │                        │
  └────────────────────────┘
       (publish now)
```

```sql
create table broadcasts (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities on delete cascade,
  author_id     uuid not null references profiles,
  title         text not null,
  body          text not null,
  severity      text not null default 'info'
                  check (severity in ('info','important','urgent')),
  audience      jsonb not null default '{"type":"all"}',
  status        text not null default 'draft'
                  check (status in ('draft','scheduled','published','archived')),
  scheduled_for timestamptz,
  published_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
```

### Severity drives behaviour

Not just a colour — it changes how the message is delivered.

| Severity | Push | Sound | In-app | Use for |
|---|---|---|---|---|
| `info` | Batched (digest) | Silent | Feed | Newsletter, minutes posted |
| `important` | Immediate | Default | Feed + banner | Pool closed, meeting reminder |
| `urgent` | Immediate, high priority | Critical | Feed + banner + persistent | Water main break, gas leak, security |

**Guard `urgent`.** If everything is urgent, nothing is. Consider requiring a
confirmation step in the compose UI ("This will send a high-priority alert to all 340
residents. Continue?"), and log who sent it.

### Audience targeting

```jsonc
{ "type": "all" }                                    // everyone in the community
{ "type": "role", "roles": ["board_member"] }        // board only
{ "type": "units", "unitIds": ["uuid", "uuid"] }     // specific units
{ "type": "building", "value": "Building C" }        // a segment
{ "type": "delinquent" }                             // units with open assessments
```

That last one is useful and sensitive — dues reminders should go only to the households
that owe. Make sure the *content* never leaks amounts to anyone but the household
itself.

---

## 3. Publishing

```ts
// supabase/functions/publish-broadcast/index.ts
Deno.serve(async (req) => {
  const { broadcastId } = await req.json();

  // 1. Authorization — board members only
  const { data: broadcast } = await supabaseAsUser
    .from('broadcasts').select('*').eq('id', broadcastId).single();
  if (!broadcast) return json({ error: 'not_found' }, 404);

  const isBoard = await hasRole(user.id, broadcast.community_id,
    ['board_member', 'manager', 'admin']);
  if (!isBoard) return json({ error: 'forbidden' }, 403);

  // 2. Idempotency — publishing twice must not double-send
  const { data: updated } = await supabaseAdmin
    .from('broadcasts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', broadcastId)
    .eq('status', 'draft')          // ← only transitions from draft
    .select()
    .maybeSingle();

  if (!updated) return json({ status: 'already_published' });

  // 3. Resolve the audience
  const recipients = await resolveAudience(broadcast.community_id, broadcast.audience);

  // 4. Create receipt rows — this is the durable record
  await supabaseAdmin.from('broadcast_receipts').insert(
    recipients.map((profileId) => ({ broadcast_id: broadcastId, profile_id: profileId }))
  );

  // 5. Push is fire-and-forget, AFTER the durable write
  await enqueuePush(broadcast, recipients);

  return json({ status: 'published', recipientCount: recipients.length });
});
```

**Order matters.** The receipt rows are written *before* push is attempted. If push
fails entirely, the broadcast is still delivered — in the app.

The `.eq('status', 'draft')` on the update is the idempotency guard: a second publish
call updates zero rows and returns early.

---

## 4. Sending push

```ts
async function enqueuePush(broadcast: Broadcast, profileIds: string[]) {
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('token, profile_id, platform')
    .in('profile_id', profileIds);

  if (!tokens?.length) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: broadcast.title,
    body: truncate(broadcast.body, 150),
    data: {
      url: `/broadcast/${broadcast.id}`,        // ← deep link, always
      broadcastId: broadcast.id,
      communityId: broadcast.community_id,
    },
    sound: broadcast.severity === 'info' ? null : 'default',
    priority: broadcast.severity === 'urgent' ? 'high' : 'normal',
    channelId: `broadcasts_${broadcast.severity}`,   // Android channel
    badge: 1,
    ttl: broadcast.severity === 'urgent' ? 3600 : 86400,
  }));

  // Expo accepts up to 100 per request
  for (const batch of chunk(messages, 100)) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });

    const { data: tickets } = await res.json();
    await handleTickets(tickets, batch);
  }
}
```

### Handling receipts and dead tokens

```ts
async function handleTickets(tickets: PushTicket[], sent: PushMessage[]) {
  const deadTokens: string[] = [];

  tickets.forEach((ticket, i) => {
    if (ticket.status === 'error') {
      const token = sent[i].to;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(token);
      } else {
        console.error('push error', ticket.details?.error, token);
      }
    }
  });

  if (deadTokens.length) {
    await supabaseAdmin.from('push_tokens').delete().in('token', deadTokens);
  }
}
```

**Delete dead tokens.** Without this, your token table fills with uninstalled devices,
every send gets slower, and your error rate climbs until real problems are invisible in
the noise.

---

## 5. Android notification channels

Android users control notifications **per channel**, not per app. Create channels that
match your severity levels so a resident can mute newsletters while keeping emergency
alerts.

```ts
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('broadcasts_urgent', {
    name: 'Urgent alerts',
    description: 'Emergencies and safety notices',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync('broadcasts_important', {
    name: 'Important announcements',
    importance: Notifications.AndroidImportance.HIGH,
  });

  await Notifications.setNotificationChannelAsync('broadcasts_info', {
    name: 'Community news',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });

  await Notifications.setNotificationChannelAsync('reservations', {
    name: 'Reservation reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.setNotificationChannelAsync('payments', {
    name: 'Payment reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
```

Well-designed channels genuinely reduce uninstalls — a resident who's annoyed by
newsletter pings can mute *those* instead of turning off everything, and then missing
the water shut-off notice.

> ⚠️ Channel settings are **immutable after creation**. Changing importance requires a
> new channel ID. Think about the taxonomy before you ship.

---

## 6. Token registration

```ts
export async function syncPushToken() {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  await setupChannels();

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;

  // Upsert — tokens rotate, and one user may have several devices
  await supabase.from('push_tokens').upsert(
    {
      profile_id: session.user.id,
      token,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
}
```

Call this on **every app launch** after sign-in, not just the first. Tokens rotate on
reinstall, OS updates, and restore-from-backup.

**On sign-out, delete the token** — or the next person to sign in on that device
receives the previous user's notifications. That's a privacy incident:

```ts
async function signOut() {
  if (pushToken) {
    await supabase.from('push_tokens').delete().eq('token', pushToken);
  }
  await supabase.auth.signOut();
}
```

---

## 7. Permission priming

The prompt appears once on iOS. Don't waste it.

```tsx
function NotificationPriming() {
  return (
    <View className="flex-1 justify-center gap-6 p-6">
      <Bell size={48} className="text-primary self-center" />
      <View className="gap-2">
        <H1 className="text-center">Stay in the loop</H1>
        <Body className="text-center text-muted-foreground">
          Get notified about pool closures, community events, and urgent
          notices from your board. You can choose exactly what you hear
          about in Settings.
        </Body>
      </View>
      <View className="gap-3">
        <Button onPress={requestPermission}>
          <Text>Turn on notifications</Text>
        </Button>
        <Button variant="ghost" onPress={skip}>
          <Text>Maybe later</Text>
        </Button>
      </View>
    </View>
  );
}
```

**When to show it:** after the user has done something meaningful — made their first
reservation, or read their first announcement. Not on first launch. A user who
understands the value grants permission at a much higher rate, and on iOS you only get
one attempt.

---

## 8. In-app experience

```tsx
export function useBroadcasts() {
  const { communityId } = useActiveCommunity();

  return useQuery({
    queryKey: broadcastKeys.list(communityId),
    queryFn: () => api.broadcasts.list(communityId),
    staleTime: 1000 * 60,
  });
}

export function useUnreadCount() {
  const { data } = useBroadcasts();
  return data?.filter((b) => !b.read_at).length ?? 0;
}
```

```tsx
// Mark read when the detail screen is actually viewed
useEffect(() => {
  if (!broadcast) return;
  const t = setTimeout(() => markRead(broadcast.id), 1500);
  return () => clearTimeout(t);
}, [broadcast?.id]);
```

The 1.5s delay means a bounce doesn't count as read — the read metric stays meaningful
for the board.

**Realtime for new broadcasts:**

```tsx
useEffect(() => {
  const channel = supabase
    .channel(`broadcasts:${communityId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'broadcasts',
        filter: `community_id=eq.${communityId}` },
      () => queryClient.invalidateQueries({ queryKey: broadcastKeys.list(communityId) })
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [communityId]);
```

---

## 9. Handling a notification tap

```tsx
// app/_layout.tsx
useEffect(() => {
  // Tapped while the app was running or backgrounded
  const responseSub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url as never);
  });

  // Tapped while the app was killed — must be checked explicitly
  Notifications.getLastNotificationResponseAsync().then((r) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url as never);
  });

  // Arrived while foregrounded — refresh, don't interrupt
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    queryClient.invalidateQueries({ queryKey: broadcastKeys.all });
  });

  return () => { responseSub.remove(); receivedSub.remove(); };
}, []);
```

**`getLastNotificationResponseAsync` is the one people forget.** Without it, tapping a
notification when the app was fully killed opens the app to the home screen instead of
the message. That's the most common case for an urgent alert, and it's a bad miss.

---

## 10. Board analytics

Boards want to know their message landed.

```sql
select
  b.id, b.title, b.published_at,
  count(r.profile_id)                              as sent,
  count(r.delivered_at)                            as delivered,
  count(r.read_at)                                 as read,
  round(100.0 * count(r.read_at) / nullif(count(r.profile_id),0), 1) as read_pct
from broadcasts b
left join broadcast_receipts r on r.broadcast_id = b.id
where b.community_id = $1 and b.status = 'published'
group by b.id
order by b.published_at desc;
```

> ⚠️ **Show aggregates to boards, never individual read status.**
>
> "312 of 400 residents have read this" is useful. "Priya at Unit 14B has not read
> this" is surveillance, and it will feel that way to residents when they find out.
>
> This is a product-values decision as much as a privacy one. Aggregate only.

---

## 11. Email fallback

Some residents won't install the app. Boards need to reach everyone.

```ts
if (broadcast.severity !== 'info') {
  const noAppResidents = recipients.filter((r) => !hasActiveDevice(r));
  await sendEmails(noAppResidents, broadcast);
}
```

Use Resend or Postmark. Rules:
- Honor unsubscribe for `info`; **never** for `urgent` (safety information)
- Include a deep link that opens the app if installed, or the web view if not
- Keep the email a summary with a link, not a duplicate of the full content

---

## 12. Test cases

```
DELIVERY
□ Push arrives on a real iOS device
□ Push arrives on a real Android device
□ Push arrives on a Samsung/Xiaomi device (battery manager)
□ Tap while app is foregrounded → correct screen
□ Tap while app is backgrounded → correct screen
□ Tap while app is KILLED → correct screen (getLastNotificationResponseAsync)
□ Push permission denied → broadcast still readable in-app
□ Notifications disabled in OS settings → still readable in-app

CORRECTNESS
□ Publish twice → recipients notified once
□ Targeted broadcast reaches only the target audience
□ A resident of community A never receives community B's broadcast
□ Sign out then sign in as another user → no cross-user notifications
□ Uninstalled device token → deleted after DeviceNotRegistered
□ Scheduled broadcast publishes at the right time in community timezone

PRIVACY
□ Delinquency reminder content doesn't reveal amounts to non-recipients
□ Board sees aggregate read counts only, never per-resident
```

That third-from-last one — a resident of one community receiving another's broadcast —
is worth an explicit automated test. It's the cross-tenant leak in its most visible
form.

---

## Check yourself

1. Why must a broadcast be a database row and not only a push notification?
2. Why write receipt rows before attempting push?
3. What breaks if you don't call `getLastNotificationResponseAsync`?
4. Why delete the push token on sign-out?
5. Why show boards only aggregate read counts?

<details>
<summary>Answers</summary>

1. Push delivery is best-effort at every layer — APNs/FCM make no guarantee, OEM battery
   managers drop notifications, and users may never grant permission. The in-app feed is
   the actual delivery mechanism; push just makes it timelier.
2. So the broadcast is durably delivered even if the entire push path fails. Push is
   fire-and-forget after the authoritative record exists.
3. Tapping a notification when the app was fully killed opens the app to the home
   screen instead of the message — which is the most common case for an urgent alert.
4. Otherwise the next person to sign in on that device receives notifications intended
   for the previous user. That's a cross-account privacy leak.
5. Per-resident read status is surveillance. In a community where everyone knows each
   other, a board member seeing "Priya hasn't read this" changes the social dynamic and
   will feel like monitoring when residents learn of it. Aggregates give boards the
   signal they need without the harm.

</details>

---

## Sources

- [Expo — Push notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo — Sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Android — Notification channels](https://developer.android.com/develop/ui/views/notifications/channels)

**Next:** [Study plan →](../07-study-plan.md)
