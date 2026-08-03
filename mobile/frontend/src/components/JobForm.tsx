import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { LocationPickerModal } from './LocationPickerModal';
import { CategoryPickerSheet } from './CategoryPickerSheet';
import { categories } from '../data/categories';
import { useApp } from '../context/AppContext';
import { ApiRequestError, BackendJob, CreateJobPayload } from '../services/api';
import { JobCategory } from '../types';

const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 8;
const MIN_PEOPLE = 1;
const MAX_PEOPLE = 3;

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

const toInitialLocation = (job?: BackendJob) => {
  if (!job) return { latitude: 28.7041, longitude: 77.1025, label: 'Pitampura, Delhi' };
  const [lng, lat] = job.location.coordinates;
  return { latitude: lat, longitude: lng, label: job.location.address };
};

export const JobForm: React.FC<JobFormProps> = ({ initialJob, submitLabel, submitting, onSubmit }) => {
  const { t } = useApp();
  const [category, setCategory] = useState<JobCategory | null>((initialJob?.category as JobCategory) ?? null);
  const [title, setTitle] = useState(initialJob?.title ?? '');
  const [description, setDescription] = useState(initialJob?.description ?? '');
  const [duration, setDuration] = useState(initialJob?.duration ?? MIN_DURATION_HOURS);
  const [pay, setPay] = useState(initialJob ? String(initialJob.payAmount) : '');
  const [people, setPeople] = useState(initialJob?.peopleNeeded ?? MIN_PEOPLE);
  const [location, setLocation] = useState(toInitialLocation(initialJob));
  const [mapVisible, setMapVisible] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    initialJob ? new Date(initialJob.scheduledFor) : null
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

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
    if (!canSubmit || !scheduledFor || !category) {
      const missing = getMissingFieldMessage();
      if (missing) Alert.alert('Missing information', `Please fill in: ${missing}`);
      return;
    }
    try {
      await onSubmit({
        category,
        title: title.trim(),
        description: description.trim(),
        location: { lat: location.latitude, lng: location.longitude, address: location.label },
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
          {category ? t(categories.find((c) => c.key === category)?.labelKey ?? 'delivery') : t('selectCategory')}
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
      <Stepper
        value={duration}
        min={MIN_DURATION_HOURS}
        max={MAX_DURATION_HOURS}
        suffix={duration === 1 ? 'hour' : 'hours'}
        onChange={setDuration}
      />

      <Input
        label={t('payAmount')}
        placeholder={t('payPlaceholder')}
        value={pay}
        onChangeText={(v) => setPay(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />

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

      <Text style={styles.sectionLabel}>{t('pickLocation')}</Text>
      <View style={styles.locationLine}>
        <Text style={styles.locationText}>{location.label}</Text>
        <Pressable onPress={() => setMapVisible(true)} hitSlop={8}>
          <Text style={styles.changeText}>{t('change')}</Text>
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
