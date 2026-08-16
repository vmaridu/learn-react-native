import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ErrorState } from '~/components/ui/empty-state';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Sheet } from '~/components/ui/sheet';
import { Skeleton, SkeletonList } from '~/components/ui/skeleton';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import {
  AmenityTile,
  DateStrip,
  SlotGrid,
  blockFits,
  bookableDates,
  durationOptions,
  useAmenity,
  useAvailability,
  useBookAmenity,
  useJoinWaitlist,
} from '~/features/amenities';
import { formatDate, formatDuration, formatTime, formatTimeRange, toISODate } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function AmenityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const amenityId = id ?? '';
  const amenity = useAmenity(amenityId);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [start, setStart] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [guests, setGuests] = useState(0);
  const [recurring, setRecurring] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [waitlistFor, setWaitlistFor] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string; detail?: string } | null>(
    null,
  );

  const availability = useAvailability(amenityId, date);
  const book = useBookAmenity();
  const waitlist = useJoinWaitlist();

  const durations = useMemo(
    () => (amenity.data ? durationOptions(amenity.data) : []),
    [amenity.data],
  );

  /** Changing the day invalidates whatever time was chosen on the previous one. */
  const selectDate = useCallback((next: string) => {
    setDate(next);
    setStart(null);
  }, []);

  const slots = availability.data?.slots ?? [];
  const selectedIndex = slots.findIndex((s) => s.start === start);
  const activeMinutes = minutes ?? amenity.data?.slotMinutes ?? 60;

  const quotaExhausted =
    !!availability.data && availability.data.quotaUsed >= availability.data.quotaPerWeek;

  const canBook =
    !!start && selectedIndex >= 0 && blockFits(slots, selectedIndex, activeMinutes) && !quotaExhausted;

  function confirmBooking() {
    if (!amenity.data || !start) return;
    book.mutate(
      {
        amenityId: amenity.data.id,
        date,
        start,
        minutes: activeMinutes,
        guests,
        recurringWeeks: recurring ? 4 : null,
      },
      {
        onSuccess(created) {
          setStart(null);
          setSuccess({
            title: 'Booked',
            message: `${amenity.data!.name} is yours on ${formatDate(date)}, ${formatTimeRange(
              start,
              activeMinutes,
            )}.`,
            detail: recurring
              ? `${created.length} weekly ${created.length === 1 ? 'session' : 'sessions'} confirmed`
              : undefined,
          });
        },
      },
    );
  }

  function confirmWaitlist() {
    if (!amenity.data || !waitlistFor) return;
    const slotStart = waitlistFor;
    waitlist.mutate(
      { amenityId: amenity.data.id, date, start: slotStart },
      {
        onSuccess(reservation) {
          setWaitlistFor(null);
          setSuccess({
            title: 'You are on the list',
            message: `We will notify you the moment ${formatTime(slotStart)} on ${formatDate(
              date,
            )} opens up.`,
            detail: `Waitlist position #${reservation.waitlistPosition ?? 1}`,
          });
        },
      },
    );
  }

  if (amenity.error) {
    return (
      <Screen>
        <ScreenHeader title="Amenity" />
        <ErrorState message={amenity.error.message} onRetry={() => void amenity.refetch()} />
      </Screen>
    );
  }

  if (amenity.isPending || !amenity.data) {
    return (
      <Screen>
        <ScreenHeader title="Amenity" />
        <View className="px-5 pt-5">
          <Skeleton className="h-32 rounded-3xl" />
        </View>
        <SkeletonList rows={2} />
      </Screen>
    );
  }

  const a = amenity.data;

  return (
    <Screen>
      <ScreenHeader
        title={a.name}
        subtitle={a.location}
        right={
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Booking rules"
            hitSlop={10}
            scaleTo={0.9}
            onPress={() => setRulesOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-full">
            <Ionicons name="information-circle-outline" size={22} color={palette.foreground} />
          </PressableScale>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <Animated.View
          entering={FadeInDown.duration(380)}
          className="flex-row items-center gap-4 px-5 pb-5 pt-5">
          <AmenityTile icon={a.icon} category={a.category} size="xl" />
          <View className="flex-1">
            <Text variant="title" numberOfLines={2}>
              {a.name}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1.5">
              {a.blurb}
            </Text>
            <View className="mt-2.5 flex-row flex-wrap gap-1.5">
              <Badge label={`Holds ${a.capacity}`} tone="neutral" icon="people-outline" />
              <Badge
                label={`Max ${formatDuration(a.rules.maxDurationMinutes)}`}
                tone="neutral"
                icon="time-outline"
              />
            </View>
          </View>
        </Animated.View>

        {/* Date */}
        <Animated.View entering={FadeInDown.delay(70).duration(380)} className="px-5">
          <Text variant="overline" tone="muted" className="pb-2.5">
            Pick a day
          </Text>
          <DateStrip dates={bookableDates(a)} value={date} onChange={selectDate} />
        </Animated.View>

        {/* Slots */}
        <Animated.View entering={FadeInDown.delay(130).duration(380)} className="px-5 pt-6">
          <View className="flex-row items-center justify-between pb-2.5">
            <Text variant="overline" tone="muted">
              Available times
            </Text>
            {!!availability.data && (
              <Text variant="caption" tone={quotaExhausted ? 'destructive' : 'muted'}>
                {availability.data.quotaUsed} of {availability.data.quotaPerWeek} weekly bookings used
              </Text>
            )}
          </View>

          {availability.isPending ? (
            <View className="flex-row flex-wrap gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-[52px] w-[86px]" />
              ))}
            </View>
          ) : slots.length === 0 ? (
            <Text variant="caption" tone="muted">
              This amenity is closed on the selected day.
            </Text>
          ) : (
            <SlotGrid
              slots={slots}
              selectedStart={start}
              durationMinutes={activeMinutes}
              onSelect={setStart}
              onWaitlist={setWaitlistFor}
            />
          )}
        </Animated.View>

        {/* Duration */}
        <Animated.View entering={FadeInDown.delay(190).duration(380)} className="px-5 pt-6">
          <Text variant="overline" tone="muted" className="pb-2.5">
            How long
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {durations.map((option) => {
              const selected = option === activeMinutes;
              const possible =
                selectedIndex < 0 || blockFits(slots, selectedIndex, option);
              return (
                <PressableScale
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={formatDuration(option)}
                  accessibilityState={{ selected, disabled: !possible }}
                  disabled={!possible}
                  haptic="select"
                  scaleTo={0.93}
                  onPress={() => setMinutes(option)}
                  className={`h-11 items-center justify-center rounded-2xl border px-4 ${
                    selected
                      ? 'border-primary bg-primary'
                      : possible
                        ? 'border-border bg-background'
                        : 'border-border bg-muted opacity-45'
                  }`}>
                  <Text
                    className={`text-[14px] font-semibold ${
                      selected ? 'text-primary-foreground' : 'text-foreground'
                    }`}>
                    {formatDuration(option)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Guests */}
        {a.rules.guestsAllowed > 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(380)} className="px-5 pt-6">
            <Text variant="overline" tone="muted" className="pb-2.5">
              Guests
            </Text>
            <View className="flex-row items-center justify-between rounded-3xl border border-border bg-card px-4 py-3">
              <View className="flex-1">
                <Text variant="subheading">{guests} guests</Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  Up to {a.rules.guestsAllowed} allowed
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Remove a guest"
                  disabled={guests === 0}
                  haptic="select"
                  scaleTo={0.88}
                  onPress={() => setGuests((g) => Math.max(0, g - 1))}
                  className={`h-10 w-10 items-center justify-center rounded-full border border-border ${
                    guests === 0 ? 'opacity-40' : ''
                  }`}>
                  <Ionicons name="remove" size={18} color={palette.foreground} />
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Add a guest"
                  disabled={guests >= a.rules.guestsAllowed}
                  haptic="select"
                  scaleTo={0.88}
                  onPress={() => setGuests((g) => Math.min(a.rules.guestsAllowed, g + 1))}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-primary ${
                    guests >= a.rules.guestsAllowed ? 'opacity-40' : ''
                  }`}>
                  <Ionicons name="add" size={18} color={palette.white} />
                </PressableScale>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Recurring */}
        <Animated.View entering={FadeInDown.delay(290).duration(380)} className="px-5 pt-4">
          <View className="flex-row items-center gap-4 rounded-3xl border border-border bg-card px-4 py-3.5">
            <View className="flex-1">
              <Text variant="subheading">Repeat weekly</Text>
              <Text variant="caption" tone="muted" className="mt-0.5">
                Books the same slot for the next 4 weeks, skipping any already taken.
              </Text>
            </View>
            <Switch value={recurring} onValueChange={setRecurring} label="Repeat weekly" />
          </View>
        </Animated.View>

        {!!book.error && (
          <Animated.View entering={FadeIn.duration(200)} className="px-5 pt-4">
            <View className="flex-row items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3">
              <Ionicons name="alert-circle" size={18} color={palette.destructive} />
              <Text variant="caption" tone="destructive" className="flex-1">
                {book.error.message}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <StickyFooter>
        <View className="mb-2 flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            {start
              ? `${formatDate(date)} · ${formatTimeRange(start, activeMinutes)}`
              : 'Choose a time to continue'}
          </Text>
          {quotaExhausted && (
            <Text variant="caption" tone="destructive">
              Weekly limit reached
            </Text>
          )}
        </View>
        <Button
          label="Confirm booking"
          size="lg"
          block
          icon="checkmark-circle-outline"
          disabled={!canBook}
          loading={book.isPending}
          onPress={confirmBooking}
        />
      </StickyFooter>

      {/* Rules */}
      <Sheet
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Booking rules"
        subtitle={`Set by the board for ${a.name}`}>
        <View className="gap-3">
          <RuleRow
            icon="time-outline"
            label="Maximum duration"
            value={formatDuration(a.rules.maxDurationMinutes)}
          />
          <RuleRow
            icon="calendar-outline"
            label="Book ahead"
            value={`Up to ${a.rules.leadTimeDays} days`}
          />
          <RuleRow
            icon="repeat-outline"
            label="Weekly limit"
            value={`${a.rules.quotaPerWeek} per unit`}
          />
          <RuleRow
            icon="people-outline"
            label="Guests"
            value={`${a.rules.guestsAllowed} allowed`}
          />
          <RuleRow icon="business-outline" label="Hours" value={`${a.openHour}:00 – ${a.closeHour}:00`} />
        </View>
        {a.rules.notes.length > 0 && (
          <View className="mt-4 gap-2 rounded-2xl bg-muted p-4">
            {a.rules.notes.map((note) => (
              <View key={note} className="flex-row gap-2">
                <Text variant="caption" tone="muted">
                  •
                </Text>
                <Text variant="caption" tone="muted" className="flex-1">
                  {note}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Sheet>

      {/* Waitlist */}
      <Sheet
        visible={!!waitlistFor}
        onClose={() => setWaitlistFor(null)}
        title="Join the waitlist"
        subtitle={
          waitlistFor
            ? `${formatTime(waitlistFor)} on ${formatDate(date)} is taken. We will text you if it frees up.`
            : undefined
        }>
        {!!waitlist.error && (
          <View className="mb-3 rounded-2xl bg-destructive-soft px-4 py-3">
            <Text variant="caption" tone="destructive">
              {waitlist.error.message}
            </Text>
          </View>
        )}
        <Button
          label="Join the waitlist"
          size="lg"
          block
          icon="hourglass-outline"
          loading={waitlist.isPending}
          onPress={confirmWaitlist}
        />
      </Sheet>

      <SuccessOverlay
        visible={!!success}
        title={success?.title ?? ''}
        message={success?.message ?? ''}
        detail={success?.detail}
        primaryLabel="View my bookings"
        onPrimary={() => {
          setSuccess(null);
          router.push('/reservations');
        }}
        secondaryLabel="Book something else"
        onSecondary={() => setSuccess(null)}
      />
    </Screen>
  );
}

function RuleRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
        <Ionicons name={icon} size={16} color={palette.primary} />
      </View>
      <Text variant="body" className="flex-1">
        {label}
      </Text>
      <Text variant="subheading">{value}</Text>
    </View>
  );
}
