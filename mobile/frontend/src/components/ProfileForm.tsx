import React, { useCallback, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { LocationPickerModal } from './LocationPickerModal';
import { useApp } from '../context/AppContext';
import { User } from '../types';

const DOB_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const formatDobInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
};

const parseDob = (value: string): string | null => {
  const match = value.match(DOB_PATTERN);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isValidCalendarDate || date.getTime() > Date.now()) return null;
  return date.toISOString();
};

const toDobDisplay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

export interface ProfileFormValues {
  name: string;
  phone?: string;
  avatar?: string;
  email?: string;
  dateOfBirth?: string;
  education?: string;
  currentAddress?: string;
  location?: { latitude: number; longitude: number; label: string };
}

interface ProfileFormProps {
  initialUser?: User | null;
  submitLabel: string;
  submitting: boolean;
  requirePhone?: boolean;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}

export interface ProfileFormHandle {
  submit: () => void;
}

export const ProfileForm = React.forwardRef<ProfileFormHandle, ProfileFormProps>(({
  initialUser,
  submitLabel,
  submitting,
  requirePhone,
  onSubmit,
}, ref) => {
  const { t } = useApp();
  const [name, setName] = useState(initialUser?.name ?? '');
  const [phoneDigits, setPhoneDigits] = useState(initialUser?.phone?.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10) ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialUser?.avatar ?? null);
  const [email, setEmail] = useState(initialUser?.email ?? '');
  const [dob, setDob] = useState(toDobDisplay(initialUser?.dateOfBirth));
  const [education, setEducation] = useState(initialUser?.education ?? '');
  const [currentAddress, setCurrentAddress] = useState(initialUser?.currentAddress ?? '');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; label: string } | null>(
    initialUser?.location ?? null
  );
  const [mapVisible, setMapVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const dobIso = dob.trim() ? parseDob(dob.trim()) : null;
  const dobHasError = dob.trim().length > 0 && !dobIso;
  const phoneHasError = !!requirePhone && phoneDigits.length > 0 && phoneDigits.length !== 10;

  const canSubmit =
    name.trim().length > 0 &&
    !dobHasError &&
    (!requirePhone || phoneDigits.length === 10) &&
    (!!location || (!!initialUser && !requirePhone));

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const useGps = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow location access to use GPS.');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
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
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label });
    } catch {
      Alert.alert('Could not get location', 'Please try dropping a pin on the map instead.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        phone: requirePhone ? `+91${phoneDigits}` : undefined,
        avatar: photoUri ?? undefined,
        email: email.trim() || undefined,
        dateOfBirth: dobIso ?? undefined,
        education: education.trim() || undefined,
        currentAddress: currentAddress.trim() || undefined,
        location: location ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Try again.');
    }
  }, [
    canSubmit,
    currentAddress,
    dobIso,
    education,
    email,
    location,
    name,
    onSubmit,
    phoneDigits,
    photoUri,
    requirePhone,
  ]);

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

  return (
    <>
      <Pressable onPress={pickPhoto} style={styles.photoWrap} accessibilityLabel={t('addPhoto')}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="camera-plus" size={32} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.photoEditBadge}>
          <MaterialCommunityIcons name="pencil" size={14} color={theme.colors.textInverse} />
        </View>
      </Pressable>
      <Text style={styles.photoLabel}>{t('addPhoto')}</Text>

      <Input label={t('yourName')} placeholder={t('namePlaceholder')} value={name} onChangeText={setName} icon="account-outline" />

      {requirePhone ? (
        <Input
          label="Phone Number"
          placeholder="Enter your phone number"
          value={phoneDigits}
          onChangeText={(value) => setPhoneDigits(value.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={10}
          icon="cellphone"
          error={phoneHasError ? 'Enter a valid 10 digit phone number' : undefined}
        />
      ) : null}

      <Input
        label={t('yourDob')}
        placeholder={t('dobPlaceholder')}
        value={dob}
        onChangeText={(value) => setDob(formatDobInput(value))}
        keyboardType="number-pad"
        maxLength={10}
        icon="cake-variant-outline"
        error={dobHasError ? t('dobInvalid') : undefined}
      />

      <Input
        label={t('yourEducation')}
        placeholder={t('educationPlaceholder')}
        value={education}
        onChangeText={setEducation}
        icon="school-outline"
      />

      <Input
        label={t('yourEmail')}
        placeholder={t('emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        icon="email-outline"
      />

      <Input
        label={t('yourCurrentAddress')}
        placeholder={t('currentAddressPlaceholder')}
        value={currentAddress}
        onChangeText={setCurrentAddress}
        icon="home-outline"
      />

      <Text style={styles.sectionLabel}>{t('yourLocation')}</Text>

      {location && (
        <View style={styles.locationChip}>
          <MaterialCommunityIcons name="map-marker-check" size={20} color={theme.colors.success} />
          <Text style={styles.locationChipText} numberOfLines={1}>
            {location.label}
          </Text>
        </View>
      )}

      <View style={styles.locationButtons}>
        <Button
          label={t('useCurrentLocation')}
          onPress={useGps}
          variant="outline"
          loading={locating}
          icon={<MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />}
          style={styles.locationBtn}
        />
        <Button
          label={t('dropPinOnMap')}
          onPress={() => setMapVisible(true)}
          variant="outline"
          icon={<MaterialCommunityIcons name="map-marker-radius" size={18} color={theme.colors.primary} />}
          style={styles.locationBtn}
        />
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Button label={submitLabel} onPress={handleSubmit} disabled={!canSubmit} loading={submitting} fullWidth style={styles.submitButton} />

      <LocationPickerModal
        visible={mapVisible}
        initialLocation={location}
        onClose={() => setMapVisible(false)}
        onConfirm={(loc) => {
          setLocation(loc);
          setMapVisible(false);
        }}
      />
    </>
  );
});

const styles = StyleSheet.create({
  photoWrap: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  photoEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  photoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    alignSelf: 'center',
  },
  sectionLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  locationChipText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  locationButtons: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  locationBtn: {
    borderColor: theme.colors.border,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
});
