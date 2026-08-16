# Native APIs

Camera, notifications, location, permissions, biometrics — the platform capabilities
that have no web equivalent worth speaking of.

---

## 1. Permissions: the model

Every sensitive capability requires permission, and getting this wrong is one of the
most visible marks of an amateur app.

### The rules

1. **Never ask on app launch.** A permission prompt before the user understands your
   app gets denied. Ask at the moment of need.
2. **Explain before you prompt.** Show your own screen explaining *why*, then trigger
   the system prompt. This is called a pre-permission or priming screen and it
   measurably increases grant rates.
3. **On iOS, denial is close to permanent.** The system prompt appears once. After
   that, the only path is Settings. Design for that.
4. **Handle denial gracefully.** The app must still work, degraded, without the
   permission.
5. **Declare a usage description**, or iOS rejects your build outright.

### The pattern

```tsx
import * as ImagePicker from 'expo-image-picker';
import { Linking, Alert } from 'react-native';

async function pickPhoto() {
  const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();

  if (status === 'granted') return launch();

  if (canAskAgain) {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.granted) return launch();
  }

  // denied and can't re-ask → send them to Settings
  Alert.alert(
    'Camera access needed',
    'Enable camera access in Settings to add a photo to your report.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}
```

The `canAskAgain` check is the part people miss. Without it you call
`requestPermissionsAsync()`, iOS silently returns "denied" without showing anything,
and the user thinks the button is broken.

### Declaring usage descriptions

```json
// app.json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Trailhead uses your camera to attach photos to trail reports.",
        "NSPhotoLibraryUsageDescription": "Choose a photo from your library to attach to a report.",
        "NSLocationWhenInUseUsageDescription": "Show campsites near you and check you in at a trailhead."
      }
    },
    "android": {
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"]
    }
  }
}
```

> ⚠️ **Write real usage strings.** Apple rejects vague ones like "This app needs
> camera access." State the specific user-facing benefit. This is a genuine, common
> rejection reason.

Most Expo modules provide a config plugin that sets these for you:

```json
{
  "plugins": [
    ["expo-camera", { "cameraPermission": "Attach photos to your trail reports." }]
  ]
}
```

Prefer the plugin form — it keeps the string next to the dependency that needs it.

---

## 2. Camera and images

For most cases you want `expo-image-picker` (the system picker), not a custom camera.

```bash
npx expo install expo-image-picker expo-image-manipulator
```

```tsx
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
});

if (!result.canceled) {
  const asset = result.assets[0];
  await uploadPhoto(asset.uri);
}
```

**Always compress before upload.** A modern phone camera produces 5–12MB images.
Uploading those over cellular is slow, expensive for the user, and will blow through
your storage budget.

```ts
import * as ImageManipulator from 'expo-image-manipulator';

const compressed = await ImageManipulator.manipulateAsync(
  asset.uri,
  [{ resize: { width: 1600 } }],
  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
);
// typically 8MB → ~300KB
```

**Custom camera UI** (`expo-camera`) only when you need overlays, barcode scanning, or
a guided capture flow:

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();

<CameraView
  facing="back"
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={({ data }) => handleQr(data)}
  style={{ flex: 1 }}
/>
```

QR scanning is directly relevant to Hamlet HQ — amenity check-in by scanning a code at
the pool gate is a clean, low-friction flow.

---

## 3. Push notifications

The most operationally complex native feature, and central to Hamlet HQ's broadcast
messaging.

### How it actually works

```
Your server
   ↓
Expo Push Service  (optional but recommended — one API for both platforms)
   ↓                    ↓
APNs (Apple)      FCM (Google)
   ↓                    ↓
        User's device
```

You can talk to APNs/FCM directly, but Expo's push service handles both with one API,
manages credentials, and gives you delivery receipts. Use it until you have a specific
reason not to.

### Setup

```bash
npx expo install expo-notifications expo-device expo-constants
```

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;          // no push on simulators

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  // Android requires a channel or notifications are silent
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Community announcements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;

  return token;
}
```

### Handling notifications

```tsx
useEffect(() => {
  // arrived while app is foregrounded
  const received = Notifications.addNotificationReceivedListener((n) => {
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  });

  // user tapped it
  const responded = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url);
  });

  return () => { received.remove(); responded.remove(); };
}, []);
```

**Always include a deep link `url` in the payload.** A notification that opens the
home screen wastes the user's tap.

### Sending

```ts
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: expoPushToken,
    title: 'Pool closed Saturday',
    body: 'Maintenance 8am–2pm. Reservations have been refunded.',
    data: { url: '/announcement/abc123' },
    channelId: 'announcements',
    badge: 1,
  }),
});
```

Batch up to 100 tokens per request. Handle `DeviceNotRegistered` receipts by deleting
the stored token — otherwise your token table fills with dead entries.

### The hard truths about push

| Reality | Implication |
|---|---|
| Delivery is **best effort**, never guaranteed | Never rely on push for critical info alone |
| iOS requires a paid Apple Developer account | Budget for it before you need it |
| Android 13+ requires runtime permission | Ask with priming, like any other permission |
| OEM battery managers (Samsung, Xiaomi, OnePlus) delay or drop notifications | Test on real devices from these brands |
| Tokens rotate | Refresh on every launch, update the server |
| Simulators can't receive push | Test on hardware |
| Users revoke permission in Settings | Re-check status; don't assume |

**Design rule for Hamlet HQ:** a broadcast must also be readable in-app. Push is a
*hint* that something happened, not the delivery mechanism itself. Store the message
server-side, show it in an announcements feed, and treat push as an accelerator. See
[Hamlet HQ messaging](../06-hamlet-hq/06-messaging.md).

---

## 4. Location

```bash
npx expo install expo-location
```

```ts
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') return;

const position = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});
```

**Accuracy affects battery significantly.** Pick the lowest that works:

| Accuracy | ~Precision | Battery |
|---|---|---|
| `Lowest` | 3km | minimal |
| `Low` | 1km | low |
| `Balanced` | 100m | moderate ← usually right |
| `High` | 10m | high |
| `BestForNavigation` | best | very high |

**Background location** requires separate permission, a stronger justification, and
gets extra scrutiny in App Store review. Don't request it unless the product genuinely
requires it. For Hamlet HQ, foreground-only is sufficient — geofenced amenity check-in
can happen while the app is open.

### Geofencing for check-in

```ts
const distance = haversine(userCoords, amenityCoords);
if (distance > 100) {
  return { ok: false, reason: 'You must be at the amenity to check in' };
}
```

⚠️ Location can be spoofed. If check-in gates anything valuable, verify server-side and
combine with something harder to fake — a QR code at the location, or staff
confirmation.

---

## 5. Biometrics

```bash
npx expo install expo-local-authentication
```

```ts
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticate() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm your payment',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });

  return result.success;
}
```

**What biometrics actually is:** a local gate. It proves the device holder is the
enrolled user. It is **not** authentication to your server — it doesn't produce a
credential the backend can verify.

The correct pattern:
1. User signs in properly once → you store a refresh token in SecureStore
2. Biometrics gates *access to that stored token*
3. The token is what authenticates to the server

Good uses: unlocking the app, confirming a payment, viewing sensitive data.

---

## 6. Other capabilities you'll want

### Haptics

```ts
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);            // tap
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // confirmation
```

Nearly free, and one of the highest ratio-of-polish-to-effort things you can add. Use
on: successful booking, payment complete, pull-to-refresh trigger, destructive
confirm. Don't overuse — constant buzzing is annoying.

### Share

```ts
import { Share } from 'react-native';

await Share.share({
  message: 'Community BBQ this Saturday at 4pm',
  url: 'https://hamlethq.com/e/abc123',   // iOS
});
```

### Calendar

```ts
import * as Calendar from 'expo-calendar';
// add a community event to the user's calendar — high-value for Hamlet HQ events
```

### Contacts, file system, clipboard, app state

```ts
import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { AppState, Linking } from 'react-native';

AppState.addEventListener('change', (s) => { /* 'active' | 'background' | 'inactive' */ });
Linking.openURL('tel:+15551234567');
Linking.openSettings();
```

---

## 7. App lifecycle

No web equivalent — apps get backgrounded, suspended, and killed by the OS.

```tsx
useEffect(() => {
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      queryClient.invalidateQueries();     // refresh stale data
      checkAuthStillValid();
    } else if (next === 'background') {
      saveDraft();
      stopLocationUpdates();
      pauseRealtimeChannels();
    }
  });
  return () => sub.remove();
}, []);
```

**The rules:**
- Save work when backgrounded — the OS can kill you without warning
- Stop expensive subscriptions (location, sockets, timers) in the background
- Refresh data when returning to foreground
- Don't assume a timer keeps running while backgrounded — it usually doesn't

**Privacy note:** iOS screenshots your app when it backgrounds, for the app switcher.
If you show financial data, blur it on `inactive`. Hamlet HQ shows payment amounts, so
this matters:

```tsx
const [obscured, setObscured] = useState(false);
useEffect(() => {
  const sub = AppState.addEventListener('change', (s) => setObscured(s !== 'active'));
  return () => sub.remove();
}, []);

{obscured && <BlurView intensity={40} className="absolute inset-0" />}
```

---

## 8. Testing native features

| Feature | Simulator | Device | Notes |
|---|---|---|---|
| Camera | ❌ | ✅ | iOS simulator has no camera |
| Push notifications | ❌ | ✅ | Requires a real token |
| Biometrics | ⚠️ | ✅ | Simulators can fake enrollment |
| Location | ⚠️ | ✅ | Simulators can mock coordinates |
| Haptics | ❌ | ✅ | |
| Background behavior | ⚠️ | ✅ | OEM differences only appear on real devices |
| Contacts/Calendar | ⚠️ | ✅ | Simulator data is empty |

**Conclusion: you need real devices.** At minimum one iPhone and one mid-range Android.
Test the permission flows on a *fresh install* — the first-run experience is the one
that decides whether users grant anything.

---

## 9. Exercise

Build Trailhead's **trail report** feature — it exercises most of this doc:

1. Tap "Report a trail condition"
2. Priming screen explains why camera + location are needed
3. Request camera permission with the full `canAskAgain` flow
4. Take/pick a photo, compress it to <500KB
5. Capture current location at `Balanced` accuracy
6. Submit with the photo uploaded to storage
7. Trigger a push notification to users following that trail
8. Tapping the notification deep-links to the report
9. Haptic feedback on successful submit
10. Works fully offline: queues the report and syncs later

**Also handle:** permission denied for camera (allow text-only report), permission
denied for location (allow manual trail selection), app backgrounded mid-flow (draft
survives), and a fresh install (the priming flow appears exactly once).

---

## Check yourself

1. Why check `canAskAgain` before calling `requestPermissionsAsync`?
2. Why must a Hamlet HQ broadcast be readable in-app rather than push-only?
3. What does biometric authentication actually prove, and what does it not?
4. Why compress images before upload, and roughly how much does it save?
5. What must you do when the app moves to `background`?

<details>
<summary>Answers</summary>

1. On iOS the system prompt shows only once. If the user has denied it, calling
   request again returns "denied" instantly with no UI — the user sees nothing happen
   and concludes the feature is broken. You need to route them to Settings instead.
2. Push delivery is best-effort: it can be delayed or dropped by APNs/FCM, killed by
   OEM battery managers, or blocked by the user's notification settings. The
   authoritative message must live in the app's own feed.
3. It proves the person holding the device is the enrolled owner — a local check. It
   does not produce a server-verifiable credential; it should gate access to a stored
   token, which is what actually authenticates.
4. Phone photos are 5–12MB; resized to 1600px at 0.7 quality they're typically
   ~300KB — roughly a 20x reduction. Saves the user's data, your storage cost, and
   makes uploads succeed on weak connections.
5. Persist any in-progress work (drafts), stop expensive subscriptions (location,
   realtime channels, timers), and obscure sensitive on-screen data before the OS
   takes its app-switcher snapshot.

</details>

---

## Sources

- [Expo SDK reference](https://docs.expo.dev/versions/latest/)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo — Push notifications overview](https://docs.expo.dev/push-notifications/overview/)
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/)

**Next:** [Animation and gestures →](./09-animation-and-gestures.md)
