import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { LocationPickerModal } from './LocationPickerModal';
import { CategoryPickerSheet } from './CategoryPickerSheet';
import { useApp } from '../context/AppContext';
import { ApiRequestError, BackendJob, CreateJobPayload, getPriceSuggestion, PriceSuggestion } from '../services/api';
import { JobCategory } from '../types';

const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 8;
const MIN_PEOPLE = 1;
const MAX_PEOPLE = 3;
const DURATION_PRESETS = [1, 2, 3, 4, 6, 8];
const PRICE_SUGGESTION_DEBOUNCE_MS = 500;

const formatClockTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// The location picker only ever hands back one free-text label (GPS reverse-geocode gives
// "district, city"; a searched/dropped pin gives a Places-style address) — there's no
// separate city/area selector anywhere in this flow. Splitting on commas and treating the
// last segment as city / first as area is a heuristic, not a guarantee: if it misses, the
// price-suggestion API just falls back to a category or global default (never blocks posting).
const deriveCityArea = (label: string): { city: string; area: string } => {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { area: parts[0], city: parts[parts.length - 1] };
  if (parts.length === 1) return { area: '', city: parts[0] };
  return { area: '', city: '' };
};

export interface JobFormValues {
  category: JobCategory;
  title: string;
  description: string;
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  scheduledFor: string;
  location: { lat: number; lng: number; address: string };
}

interface JobFormProps {
  initialJob?: BackendJob;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: CreateJobPayload) => Promise<void>;
}

const toInitialLocation = (job: BackendJob) => {
  const [lng, lat] = job.location.coordinates;
  return { latitude: lat, longitude: lng, label: job.location.address };
};

type LocationValue = { latitude: number; longitude: number; label: string };

export const JobForm: React.FC<JobFormProps> = ({ initialJob, submitLabel, submitting, onSubmit }) => {
  const { t, categories, accessToken } = useApp();
  const [category, setCategory] = useState<JobCategory | null>((initialJob?.category as JobCategory) ?? null);
  const [title, setTitle] = useState(initialJob?.title ?? '');
  const [description, setDescription] = useState(initialJob?.description ?? '');
  const [duration, setDuration] = useState(initialJob?.duration ?? MIN_DURATION_HOURS);
  const [customDurationMode, setCustomDurationMode] = useState(
    !!initialJob && !DURATION_PRESETS.includes(initialJob.duration)
  );
  const [pay, setPay] = useState(initialJob ? String(initialJob.payAmount) : '');
  const [people, setPeople] = useState(initialJob?.peopleNeeded ?? MIN_PEOPLE);
  const [location, setLocation] = useState<LocationValue | null>(initialJob ? toInitialLocation(initialJob) : null);
  const [locating, setLocating] = useState(!initialJob);
  const [mapVisible, setMapVisible] = useState(false);

  // New posts default to the poster's own GPS location instead of a fixed
  // placeholder — a manual pin drop (via "Change") always wins over this.
  useEffect(() => {
    if (initialJob) return;
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        let label = 'Current Location';
        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (places[0]) {
            label = [places[0].district, places[0].city].filter(Boolean).join(', ') || label;
          }
        } catch {
          // reverse geocode best-effort only
        }
        if (!cancelled) setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label });
      } catch {
        // GPS unavailable — user can still drop a pin manually
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialJob]);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    initialJob ? new Date(initialJob.scheduledFor) : null
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);

  useEffect(() => {
    if (!accessToken || !category || !location) {
      setPriceSuggestion(null);
      return;
    }
    const { city, area } = deriveCityArea(location.label);
    let cancelled = false;
    const timer = setTimeout(() => {
      getPriceSuggestion(accessToken, { city, area, category, durationMinutes: duration * 60 })
        .then((res) => {
          if (!cancelled) setPriceSuggestion(res.data);
        })
        .catch(() => {
          if (!cancelled) setPriceSuggestion(null);
        });
    }, PRICE_SUGGESTION_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, category, location, duration]);

  const openDateTimePicker = () => {
    if (Platform.OS !== 'android') {
      setPickerVisible(true);
      return;
    }
    // Android's native picker only supports one mode (date OR time) at a time,
    // and v9's <DateTimePicker> inline component crashes on this platform —
    // so pick the date first, then chain into the time picker on success.
    DateTimePickerAndroid.open({
      value: scheduledFor ?? new Date(),
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'dismissed' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type === 'dismissed' || !time) return;
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes());
            setScheduledFor(combined);
          },
        });
      },
    });
  };

  const canSubmit =
    !!category &&
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    pay.trim().length > 0 &&
    !!location &&
    !!scheduledFor;

  const getMissingFieldMessage = () => {
    if (!category) return t('selectCategory');
    if (title.trim().length < 3) return `${t('jobTitle')} (at least 3 characters)`;
    if (description.trim().length < 10) return `${t('aboutJob')} (at least 10 characters)`;
    if (!pay.trim()) return t('payAmount');
    if (!scheduledFor) return t('scheduledForLabel');
    if (!location) return t('pickLocation');
    return null;
  };

  const handleSubmit = async () => {
    if (!canSubmit || !scheduledFor || !category || !location) {
      const missing = getMissingFieldMessage();
      if (missing) Alert.alert('Missing information', `Please fill in: ${missing}`);
      return;
    }
    try {
      const { city, area } = deriveCityArea(location.label);
      await onSubmit({
        category,
        title: title.trim(),
        description: description.trim(),
        location: { lat: location.latitude, lng: location.longitude, address: location.label },
        city,
        area,
        duration,
        payAmount: Number(pay),
        peopleNeeded: people,
        scheduledFor: scheduledFor.toISOString(),
      });
    } catch (e) {
      const detailMessage =
        e instanceof ApiRequestError && e.details?.length
          ? e.details.map((d) => d.message).join('\n')
          : e instanceof Error
            ? e.message
            : 'Try again.';
      Alert.alert('Could not save job', detailMessage);
    }
  };

  return (
    <>
      <Input label={t('jobTitle')} placeholder={t('jobTitlePlaceholder')} value={title} onChangeText={setTitle} />

      <Text style={styles.sectionLabel}>{t('selectCategory')}</Text>
      <Pressable style={styles.selectBox} onPress={() => setCategoryPickerVisible(true)}>
        <Text style={category ? styles.locationText : styles.selectPlaceholder}>
          {category ? categories.find((c) => c.key === category)?.label ?? category : t('selectCategory')}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.colors.textSecondary} />
      </Pressable>

      <View style={styles.textAreaWrap}>
        <Text style={styles.sectionLabel}>{t('aboutJob')}</Text>
        <Input
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
      </View>

      <Text style={styles.sectionLabel}>{t('duration')}</Text>
      <View style={styles.chipRow}>
        {DURATION_PRESETS.map((hours) => {
          const selected = !customDurationMode && duration === hours;
          return (
            <Pressable
              key={hours}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setCustomDurationMode(false);
                setDuration(hours);
              }}
              style={[styles.chip, selected && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {hours} {hours === 1 ? 'hr' : 'hrs'}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: customDurationMode }}
          onPress={() => setCustomDurationMode(true)}
          style={[styles.chip, customDurationMode && styles.chipActive]}
        >
          <Text style={[styles.chipText, customDurationMode && styles.chipTextActive]}>{t('customDuration')}</Text>
        </Pressable>
      </View>
      {customDurationMode && (
        <Stepper
          value={duration}
          min={MIN_DURATION_HOURS}
          max={MAX_DURATION_HOURS}
          suffix={duration === 1 ? 'hour' : 'hours'}
          onChange={setDuration}
        />
      )}

      {priceSuggestion && (
        <View style={styles.priceSuggestionCard}>
          <MaterialCommunityIcons name="cash-check" size={18} color={theme.colors.success} />
          <Text style={styles.priceSuggestionText}>
            Recommended minimum: ₹{priceSuggestion.suggestedMinimum}
          </Text>
        </View>
      )}

      <Input
        label={t('payAmount')}
        placeholder={t('payPlaceholder')}
        value={pay}
        onChangeText={(v) => setPay(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />
      {priceSuggestion && !!pay && Number(pay) < priceSuggestion.suggestedMinimum && (
        <Text style={styles.priceWarning}>
          ₹{pay} is below the recommended ₹{priceSuggestion.suggestedMinimum} for this job.
        </Text>
      )}

      <Text style={styles.sectionLabel}>{t('peopleNeededLabel')}</Text>
      <Stepper
        value={people}
        min={MIN_PEOPLE}
        max={MAX_PEOPLE}
        suffix={people === 1 ? 'person' : 'people'}
        onChange={setPeople}
      />

      <Text style={styles.sectionLabel}>{t('scheduledForLabel')}</Text>
      <Pressable style={styles.selectBox} onPress={openDateTimePicker}>
        <Text style={scheduledFor ? styles.locationText : styles.selectPlaceholder}>
          {scheduledFor ? scheduledFor.toLocaleString() : t('pickDateTime')}
        </Text>
        <MaterialCommunityIcons name="calendar-clock-outline" size={22} color={theme.colors.textSecondary} />
      </Pressable>
      {Platform.OS !== 'android' && pickerVisible && (
        <DateTimePicker
          value={scheduledFor ?? new Date()}
          mode="datetime"
          minimumDate={new Date()}
          onValueChange={(_event, date) => {
            if (date) setScheduledFor(date);
          }}
          onDismiss={() => setPickerVisible(false)}
        />
      )}

      {scheduledFor && (
        <View style={styles.summaryCard}>
          <SummaryRow label={t('jobStartsLabel')} value={scheduledFor.toLocaleString()} />
          <SummaryRow
            label={t('expectedDurationLabel')}
            value={`${duration} ${duration === 1 ? 'hour' : 'hours'}`}
          />
          <SummaryRow
            label={t('expectedEndLabel')}
            value={formatClockTime(new Date(scheduledFor.getTime() + duration * 60 * 60 * 1000))}
          />
        </View>
      )}

      <Text style={styles.sectionLabel}>{t('pickLocation')}</Text>
      <View style={styles.locationLine}>
        <Text style={location ? styles.locationText : styles.selectPlaceholder}>
          {locating ? 'Detecting your location…' : (location?.label ?? t('pickLocation'))}
        </Text>
        <Pressable onPress={() => setMapVisible(true)} hitSlop={8}>
          <Text style={styles.changeText}>{location ? t('change') : t('dropPinOnMap')}</Text>
        </Pressable>
      </View>

      <Button label={submitLabel} onPress={handleSubmit} loading={submitting} fullWidth style={styles.submitButton} />

      <LocationPickerModal
        visible={mapVisible}
        initialLocation={location}
        onClose={() => setMapVisible(false)}
        onConfirm={(loc) => {
          setLocation(loc);
          setMapVisible(false);
        }}
      />

      <CategoryPickerSheet
        visible={categoryPickerVisible}
        activeCategory={category ?? 'all'}
        showAllOption={false}
        onSelect={(cat) => {
          if (cat !== 'all') setCategory(cat);
        }}
        onClose={() => setCategoryPickerVisible(false)}
      />
    </>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const Stepper: React.FC<{
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}> = ({ value, min, max, suffix, onChange }) => (
  <View style={styles.stepperRow}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Decrease"
      disabled={value <= min}
      onPress={() => onChange(Math.max(min, value - 1))}
      style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}
    >
      <MaterialCommunityIcons name="minus" size={20} color={value <= min ? theme.colors.textMuted : theme.colors.primary} />
    </Pressable>
    <Text style={styles.stepperValue}>
      {value} {suffix}
    </Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Increase"
      disabled={value >= max}
      onPress={() => onChange(Math.min(max, value + 1))}
      style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}
    >
      <MaterialCommunityIcons name="plus" size={20} color={value >= max ? theme.colors.textMuted : theme.colors.primary} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  sectionLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    marginBottom: theme.spacing.md,
  },
  locationText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  changeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  chipTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  priceSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successLight,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  priceSuggestionText: {
    ...theme.typography.bodyBold,
    color: theme.colors.success,
  },
  priceWarning: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  textAreaWrap: {
    marginTop: theme.spacing.xs,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.xs,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
});
