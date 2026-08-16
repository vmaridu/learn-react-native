# Forms and Validation

The libraries are identical to your web stack. The **keyboard** is the new problem.

---

## 1. The stack

```bash
pnpm add react-hook-form zod @hookform/resolvers
npx expo install react-native-keyboard-controller
```

React Hook Form + Zod work exactly as on the web. That part is free. Budget your
learning time for keyboard handling and native input behavior instead.

---

## 2. A complete form

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookingSchema = z.object({
  guestName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  partySize: z.coerce.number().int().min(1).max(12, 'Maximum 12 guests'),
  notes: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export function BookingForm({ onSubmit }: { onSubmit: (v: BookingForm) => Promise<void> }) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { guestName: '', email: '', partySize: 1, notes: '' },
  });

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="guestName"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Name" error={errors.guestName?.message}>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Your name"
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="next"
              className="rounded-lg border border-border px-3 py-3 text-foreground"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Email" error={errors.email?.message}>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              className="rounded-lg border border-border px-3 py-3 text-foreground"
            />
          </FormField>
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        <Text>{isSubmitting ? 'Booking…' : 'Confirm booking'}</Text>
      </Button>
    </View>
  );
}
```

**The one structural difference from web RHF:** you must use `<Controller>` (or
`useController`) because React Native inputs aren't DOM nodes and don't support
`register()`'s ref-based approach.

**`FormField` wrapper** — build this once:

```tsx
function FormField({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      {children}
      {error ? (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
```

`accessibilityLiveRegion="polite"` makes screen readers announce validation errors —
a small detail that matters.

---

## 3. `TextInput` props that matter

Getting these right is most of what separates a professional-feeling form from an
amateur one. They're cheap and users notice.

| Prop | Why |
|---|---|
| `keyboardType` | `email-address`, `numeric`, `phone-pad`, `decimal-pad`, `url` |
| `autoCapitalize` | `none` for emails/usernames — otherwise iOS capitalizes them |
| `autoCorrect={false}` | For emails, names, codes |
| `textContentType` (iOS) | Enables autofill: `emailAddress`, `password`, `oneTimeCode` |
| `autoComplete` (Android) | Same idea: `email`, `password`, `sms-otp` |
| `returnKeyType` | `next`, `done`, `search`, `go` |
| `onSubmitEditing` | Fires on the return key |
| `secureTextEntry` | Password masking |
| `blurOnSubmit={false}` | Keep the keyboard open when moving to the next field |
| `maxLength` | Hard limit |
| `selectTextOnFocus` | Useful for editing numbers |

**`textContentType="oneTimeCode"`** is worth calling out: it makes iOS offer the SMS
verification code above the keyboard. If Hamlet HQ uses phone verification, this is a
meaningful conversion win. Android's equivalent is `autoComplete="sms-otp"`.

### Field-to-field focus

```tsx
const emailRef = useRef<TextInput>(null);

<TextInput
  returnKeyType="next"
  blurOnSubmit={false}
  onSubmitEditing={() => emailRef.current?.focus()}
/>
<TextInput ref={emailRef} returnKeyType="done" onSubmitEditing={handleSubmit(onSubmit)} />
```

`blurOnSubmit={false}` prevents the keyboard from closing and reopening — without it
you get a visible flicker between fields.

---

## 4. Keyboard handling

The genuinely new problem. There is no browser auto-scroll-into-view; the keyboard
will cover your input and it's your job to prevent that.

### Use `react-native-keyboard-controller`

The built-in `KeyboardAvoidingView` requires different `behavior` values per platform,
handles nested scroll views poorly, and animates out of sync with the system keyboard.
`react-native-keyboard-controller` is meaningfully better and is what I'd recommend by
default.

```bash
npx expo install react-native-keyboard-controller
```

```tsx
// app/_layout.tsx
import { KeyboardProvider } from 'react-native-keyboard-controller';

<KeyboardProvider>
  <Stack />
</KeyboardProvider>
```

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView
  bottomOffset={24}
  contentContainerClassName="p-4 gap-4"
  keyboardShouldPersistTaps="handled"
>
  <BookingForm />
</KeyboardAwareScrollView>
```

That's it — inputs scroll into view, animations track the keyboard exactly, and it
behaves the same on both platforms.

### `keyboardShouldPersistTaps="handled"`

Without this, the first tap on a button while the keyboard is open only dismisses the
keyboard — the button doesn't fire. Users experience this as "the button doesn't work."

Set it on every scroll view containing a form. This is one of the most common bugs in
shipped React Native apps.

### Android `softwareKeyboardLayoutMode`

```json
// app.json
{ "expo": { "android": { "softwareKeyboardLayoutMode": "pan" } } }
```

`pan` shifts the whole screen up; `resize` shrinks the viewport. `pan` generally
behaves better with `KeyboardAwareScrollView`.

### Dismissing the keyboard

```tsx
import { Keyboard } from 'react-native';

Keyboard.dismiss();

// dismiss on tap outside
<Pressable onPress={Keyboard.dismiss} className="flex-1">
```

---

## 5. Validation strategy

Three layers, each catching different failures:

```
1. Client (Zod)      → instant feedback, good UX          — can be bypassed
2. API (Zod)         → the real gate                      — trust boundary
3. Database          → constraints, RLS                   — last line of defense
```

**Share the schema between client and server.** In a monorepo, put schemas in
`packages/core` and import from both. One definition, no drift:

```ts
// packages/core/src/schemas/booking.ts
export const createBookingSchema = z.object({
  amenityId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  partySize: z.number().int().min(1).max(12),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'End time must be after start time',
  path: ['endsAt'],
});
```

> ⚠️ **Never trust client validation.** A modified client can send anything. This
> matters enormously for Hamlet HQ — booking rules, payment amounts, and permissions
> must be enforced server-side. See [Hamlet HQ payments](../06-hamlet-hq/04-payments.md).

### Validation timing

```tsx
useForm({
  mode: 'onTouched',        // validate after first blur — best default
  reValidateMode: 'onChange', // then live-update once touched
});
```

| Mode | Feel |
|---|---|
| `onSubmit` | Errors appear all at once. Fine for short forms. |
| `onBlur` | Validates when leaving a field. |
| `onTouched` | ✅ Validates after first blur, then live. Best balance. |
| `onChange` | Errors while typing — feels aggressive and nagging. |

---

## 6. Native inputs

### Date and time

```bash
npx expo install @react-native-community/datetimepicker
```

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';

const [show, setShow] = useState(false);

<Pressable onPress={() => setShow(true)}>
  <Text>{format(date, 'PPP')}</Text>
</Pressable>

{show && (
  <DateTimePicker
    value={date}
    mode="date"
    minimumDate={new Date()}
    onChange={(event, selected) => {
      setShow(Platform.OS === 'ios');     // Android auto-dismisses
      if (selected) setDate(selected);
    }}
  />
)}
```

⚠️ iOS renders inline and stays open; Android opens a dialog and closes itself. The
`setShow(Platform.OS === 'ios')` line handles both. This asymmetry catches everyone.

For a reservation flow, a **calendar** is usually better than a date picker:

```bash
npx expo install react-native-calendars
```

### Select / picker

Native pickers look very different across platforms. For anything beyond a trivial
choice, a **bottom sheet with a list** gives you consistent, controllable UX:

```tsx
<Pressable onPress={() => sheetRef.current?.expand()} className="rounded-lg border p-3">
  <Text>{selected?.label ?? 'Choose an amenity'}</Text>
</Pressable>

<BottomSheet ref={sheetRef} snapPoints={['50%']}>
  <BottomSheetFlatList
    data={options}
    renderItem={({ item }) => (
      <Pressable onPress={() => { onSelect(item); sheetRef.current?.close(); }} className="p-4">
        <Text>{item.label}</Text>
      </Pressable>
    )}
  />
</BottomSheet>
```

### Switch and slider

```tsx
import { Switch } from 'react-native';
import Slider from '@react-native-community/slider';

<Switch value={enabled} onValueChange={setEnabled} />
<Slider minimumValue={1} maximumValue={12} step={1} value={size} onValueChange={setSize} />
```

---

## 7. Submission

```tsx
const mutation = useMutation({
  mutationFn: api.bookings.create,
  onSuccess: (booking) => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    router.replace(`/booking/${booking.id}/confirmation`);
  },
  onError: (error) => {
    if (error instanceof ConflictError) {
      setError('startsAt', { message: 'That slot was just taken. Pick another time.' });
      return;
    }
    Alert.alert('Booking failed', getUserMessage(error));
  },
});

<Button onPress={handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
```

**Submission checklist:**

- [ ] Button disabled while submitting (prevents double-submit)
- [ ] Visible loading state
- [ ] Server errors mapped back onto specific fields where possible
- [ ] Network failure handled distinctly from validation failure
- [ ] Success navigates away or clearly confirms
- [ ] Haptic feedback on success/failure (`expo-haptics`) — cheap, feels good
- [ ] Idempotency key for anything that creates money or a booking

That last one matters. On a flaky mobile network the user *will* tap twice:

```ts
const idempotencyKey = useRef(crypto.randomUUID()).current;
mutation.mutate({ ...values, idempotencyKey });
```

The server rejects the duplicate. Without this you get double bookings and double
charges — see [payments](../06-hamlet-hq/04-payments.md).

---

## 8. Multi-step forms

Hamlet HQ's reservation flow is multi-step: pick amenity → pick time → confirm → pay.

Use **one form instance across steps** rather than separate forms:

```tsx
const methods = useForm<ReservationForm>({
  resolver: zodResolver(reservationSchema),
  defaultValues: { /* ... */ },
});

// step-by-step validation
const next = async () => {
  const ok = await methods.trigger(['amenityId']);   // validate only this step's fields
  if (ok) setStep((s) => s + 1);
};

<FormProvider {...methods}>
  {step === 0 && <PickAmenity />}
  {step === 1 && <PickTime />}
  {step === 2 && <Confirm />}
</FormProvider>
```

Child steps read the form via `useFormContext()`. State survives navigation between
steps automatically.

**Persist drafts.** Mobile apps get backgrounded and killed. Losing a half-filled form
is infuriating:

```tsx
const values = methods.watch();
useEffect(() => {
  const t = setTimeout(() => storage.set('booking-draft', JSON.stringify(values)), 500);
  return () => clearTimeout(t);
}, [values]);
```

---

## 9. Common mistakes

| Mistake | Effect | Fix |
|---|---|---|
| No `keyboardShouldPersistTaps` | First button tap does nothing | `"handled"` |
| `autoCapitalize` left default on email | "User@example.com" | `autoCapitalize="none"` |
| Wrong `keyboardType` | Users hunt for the @ symbol | Set it per field |
| No double-submit guard | Duplicate bookings/charges | Disable + idempotency key |
| Only client-side validation | Trivially bypassed | Validate server-side too |
| `onChange` validation mode | Feels like nagging | `onTouched` |
| Errors not announced | Inaccessible | `accessibilityLiveRegion` |
| Draft lost on backgrounding | Rage | Persist to MMKV |
| Date picker not handling Android dismissal | Picker stuck open | `setShow(Platform.OS === 'ios')` |

---

## 10. Exercise

Build Trailhead's **booking flow** — a four-step form:

1. **Site & dates** — calendar, min/max date, disabled unavailable days
2. **Party details** — name, email, party size, notes
3. **Add-ons** — switches and quantity steppers
4. **Review & confirm** — summary, terms checkbox, submit

Requirements:
- One `useForm` instance across steps, per-step validation with `trigger`
- Zod schema shared with (a mock) API layer
- Keyboard never covers an input; tested on both platforms
- Draft persists if the app is backgrounded and killed
- Server-side conflict error ("slot taken") maps to a field error and returns to step 1
- Idempotency key prevents double submission
- Full screen-reader pass: every field labeled, errors announced
- Haptic feedback on success

This is the most realistic exercise in the curriculum — it's very close to what Hamlet
HQ's core flow actually requires.

---

## Check yourself

1. Why does RHF need `<Controller>` in React Native but not on the web?
2. User taps "Submit" with the keyboard open and nothing happens. Why?
3. Where must booking-conflict validation live, and why not only on the client?
4. How do you prevent a double charge when the user double-taps on a bad network?
5. Why does the date picker behave differently on iOS vs Android?

<details>
<summary>Answers</summary>

1. `register()` relies on DOM refs and native form events. React Native inputs are not
   DOM nodes and use `onChangeText`/`value`, so `Controller` bridges RHF's state to
   the component's controlled props.
2. Missing `keyboardShouldPersistTaps="handled"` — the first tap is consumed dismissing
   the keyboard instead of reaching the button.
3. Server-side (and enforced in the database with a constraint). The client can be
   modified or run stale data; two users can also submit simultaneously, so only the
   server can arbitrate.
4. Disable the button while the mutation is pending **and** send an idempotency key so
   the server can reject the duplicate even if two requests actually arrive.
5. iOS renders the picker inline and expects the app to dismiss it; Android presents a
   modal dialog that dismisses itself. Hence `setShow(Platform.OS === 'ios')`.

</details>

---

## Sources

- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [react-native-keyboard-controller](https://kirillzyusko.github.io/react-native-keyboard-controller/)
- [React Native — TextInput](https://reactnative.dev/docs/textinput)

**Next:** [State and data →](./07-state-and-data.md)
