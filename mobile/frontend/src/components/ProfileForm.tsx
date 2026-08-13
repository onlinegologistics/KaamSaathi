import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { LocationPickerModal } from './LocationPickerModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { useApp } from '../context/AppContext';
import {
  AccountType,
  EmployerKind,
  EmployerProfile,
  Gender,
  JobCategory,
  KycProfile,
  ReviewStatus,
  User,
  WalletProfile,
  WorkerProfile,
} from '../types';

const MAX_DOB_AGE_YEARS = 100;

// Calendar values land on local midnight for the picked day; normalizing to UTC
// midnight keeps the stored date from shifting a day when serialized/parsed
// across timezones (mirrors how the backend stores dateOfBirth).
const toUtcMidnight = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const getDefaultDobDate = () => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 25);
  return toUtcMidnight(d);
};

const getMinDobDate = () => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - MAX_DOB_AGE_YEARS);
  return toUtcMidnight(d);
};

const formatDobDisplay = (date: Date) => {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const employerKindOptions: { value: EmployerKind; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
];

const listToText = (values?: string[]) => values?.join(', ') ?? '';
const textToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const numberToText = (value?: number) => (typeof value === 'number' ? String(value) : '');
const textToNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

// Picked images live at a local, device-only path (file://...). Encoding them as a
// data URI makes the value itself the persisted "URL" — no separate upload step needed,
// and it still renders anywhere (server, other devices) since the bytes travel with it.
const toDataUri = (asset: ImagePicker.ImagePickerAsset) =>
  asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;

const getCategoryDocumentIcon = (category: JobCategory): keyof typeof MaterialCommunityIcons.glyphMap =>
  ['delivery', 'driver'].includes(category) ? 'card-account-details-star-outline' : 'file-document-outline';

type ProfileFormSection = 'all' | 'profile' | 'kyc' | 'wallet';

export interface ProfileFormValues {
  name: string;
  phone?: string;
  avatar?: string;
  email?: string;
  password?: string;
  accountType?: 'worker' | 'employer' | 'both';
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  dateOfBirth?: string;
  gender?: Gender;
  languages?: string[];
  education?: string;
  currentAddress?: string;
  workerProfile?: WorkerProfile;
  employerProfile?: EmployerProfile;
  kyc?: KycProfile;
  wallet?: WalletProfile;
  location?: { latitude: number; longitude: number; label: string };
}

interface ProfileFormProps {
  initialUser?: User | null;
  /** Seeds the name/email fields without triggering "editing an existing user" behavior
   *  (e.g. the account-type picker still shows) — used to pre-fill a fresh registration
   *  from an OAuth profile while leaving every field editable. */
  initialName?: string;
  initialEmail?: string;
  submitLabel: string;
  submitting: boolean;
  requirePhone?: boolean;
  showExtras?: boolean;
  section?: ProfileFormSection;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}

export interface ProfileFormHandle {
  submit: () => void;
}

export const ProfileForm = React.forwardRef<ProfileFormHandle, ProfileFormProps>(({
  initialUser,
  initialName,
  initialEmail,
  submitLabel,
  submitting,
  requirePhone,
  showExtras,
  section = 'all',
  onSubmit,
}, ref) => {
  const displayExtras = showExtras ?? !requirePhone;
  const showProfileSection = section === 'all' || section === 'profile';
  const showKycSection = displayExtras && (section === 'all' || section === 'kyc');
  const showWalletSection = displayExtras && (section === 'all' || section === 'wallet');
  const kycApproved = section === 'kyc' && initialUser?.kyc?.status === 'verified';
  const showCoreFields = !displayExtras || showProfileSection;
  const { t, categories } = useApp();
  const [name, setName] = useState(initialUser?.name ?? initialName ?? '');
  const [phoneDigits, setPhoneDigits] = useState(initialUser?.phone?.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10) ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialUser?.avatar ?? null);
  const [email, setEmail] = useState(initialUser?.email ?? initialEmail ?? '');
  const [dobDate, setDobDate] = useState<Date | null>(
    initialUser?.dateOfBirth ? toUtcMidnight(new Date(initialUser.dateOfBirth)) : null
  );
  const [gender, setGender] = useState<Gender | undefined>(initialUser?.gender);
  const [languagesText, setLanguagesText] = useState(listToText(initialUser?.languages));
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [education, setEducation] = useState(initialUser?.education ?? '');
  const [currentAddress, setCurrentAddress] = useState(initialUser?.currentAddress ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(
    initialUser?.accountType ?? 'worker'
  );
  const [skillsText, setSkillsText] = useState(listToText(initialUser?.workerProfile?.skills));
  const [experienceYears, setExperienceYears] = useState(numberToText(initialUser?.workerProfile?.experienceYears));
  const [preferredWorkCategories, setPreferredWorkCategories] = useState<JobCategory[]>(
    initialUser?.workerProfile?.preferredWorkCategories ?? []
  );
  const [workRadiusKm, setWorkRadiusKm] = useState(numberToText(initialUser?.workerProfile?.workRadiusKm));
  const [employerKind, setEmployerKind] = useState<EmployerKind>(
    initialUser?.employerProfile?.kind ?? 'individual'
  );
  const [companyName, setCompanyName] = useState(initialUser?.employerProfile?.companyName ?? '');
  const [gstNumber, setGstNumber] = useState(initialUser?.employerProfile?.gstNumber ?? '');
  const [officeAddress, setOfficeAddress] = useState(initialUser?.employerProfile?.officeAddress ?? '');
  const [companyLogoUri, setCompanyLogoUri] = useState<string | null>(
    initialUser?.employerProfile?.companyLogoUrl ?? null
  );
  const [companyVerificationRequested, setCompanyVerificationRequested] = useState(
    initialUser?.employerProfile?.companyVerificationRequested ?? false
  );
  const [aadhaarCardUri, setAadhaarCardUri] = useState<string | null>(initialUser?.kyc?.aadhaarCardUrl ?? null);
  const [selfieUri, setSelfieUri] = useState<string | null>(initialUser?.kyc?.selfieUrl ?? null);
  const [categoryDocumentUris, setCategoryDocumentUris] = useState<Partial<Record<JobCategory, string>>>(() => {
    const values: Partial<Record<JobCategory, string>> = {};
    initialUser?.kyc?.categoryDocuments?.forEach((document) => {
      if (document.documentUrl) values[document.category] = document.documentUrl;
    });
    if (initialUser?.kyc?.drivingLicenseUrl && !values.driver && !values.delivery) {
      values.driver = initialUser.kyc.drivingLicenseUrl;
    }
    return values;
  });
  const [upiId, setUpiId] = useState(initialUser?.wallet?.upiId ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(initialUser?.wallet?.bankAccountNumber ?? '');
  const [bankAccountHolderName, setBankAccountHolderName] = useState(initialUser?.wallet?.bankAccountHolderName ?? '');
  const [ifscCode, setIfscCode] = useState(initialUser?.wallet?.ifscCode ?? '');
  const [panNumber, setPanNumber] = useState(initialUser?.wallet?.panNumber ?? '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; label: string } | null>(
    initialUser?.location ?? null
  );
  const [mapVisible, setMapVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined);
  const previewOnConfirmRef = useRef<((uri: string) => void) | null>(null);

  const dobIso = dobDate ? dobDate.toISOString() : null;
  const emailValue = email.trim();
  const passwordValue = password.trim();
  const phoneHasError = !!requirePhone && phoneDigits.length > 0 && phoneDigits.length !== 10;
  const emailHasError = !!requirePhone && emailValue.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const passwordHasError = !!requirePhone && passwordValue.length > 0 && passwordValue.length < 6;
  const showWorkerProfile = displayExtras && (accountType === 'worker' || accountType === 'both');
  const showEmployerProfile = displayExtras && (accountType === 'employer' || accountType === 'both');
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { name: string; items: typeof categories }>();
    categories.forEach((category) => {
      const key = category.groupKey ?? 'other';
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(category);
      } else {
        groups.set(key, { name: category.groupName ?? 'Other', items: [category] });
      }
    });
    return Array.from(groups.entries()).map(([key, group]) => ({ key, ...group }));
  }, [categories]);
  // Collapsed by default so the 4 main categories read as a tidy list rather than every
  // sub-category dumped on screen at once — a group auto-opens if it already has a pick in it
  // (e.g. re-opening this form later) so existing selections aren't hidden from view.
  const [expandedCategoryGroups, setExpandedCategoryGroups] = useState<string[]>(() =>
    categoryGroups
      .filter((group) => group.items.some((item) => preferredWorkCategories.includes(item.key)))
      .map((group) => group.key)
  );
  const toggleCategoryGroup = (key: string) => {
    setExpandedCategoryGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const requiredCategoryDocuments = useMemo(
    () =>
      Array.from(new Set(showWorkerProfile ? preferredWorkCategories : [])).map((category) => {
        const meta = categories.find((item) => item.key === category);
        return {
          category,
          label: meta?.kycDocumentLabel || `${meta?.label ?? 'Work'} Document`,
        };
      }),
    [categories, preferredWorkCategories, showWorkerProfile]
  );

  const canSubmit =
    name.trim().length > 0 &&
    (!requirePhone || phoneDigits.length === 10) &&
    // Email is optional — only its format is validated when something's actually typed.
    !emailHasError &&
    (!requirePhone || passwordValue.length >= 6) &&
    (!!location || (!!initialUser && !requirePhone)) &&
    (!requirePhone || termsAccepted);

  const openDobPicker = () => {
    const initial = dobDate ?? getDefaultDobDate();
    const maximumDate = new Date();
    const minimumDate = getMinDobDate();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'dismissed' || !date) return;
          setDobDate(toUtcMidnight(date));
        },
      });
      return;
    }
    setDobPickerVisible(true);
  };

  // Picking never commits straight into form state — it stages the result behind the
  // preview modal so there's always an explicit save step (the modal's confirm arrow)
  // before an image/document is actually kept, on top of whatever crop step the native
  // picker itself offered.
  const stageForPreview = (uri: string, title: string, onPick: (uri: string) => void) => {
    setPreviewUri(uri);
    setPreviewTitle(title);
    previewOnConfirmRef.current = onPick;
  };

  const pickImage = async (title: string, onPick: (uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      stageForPreview(toDataUri(result.assets[0]), title, onPick);
    }
  };

  const pickPhoto = () => pickImage('Profile Photo', setPhotoUri);
  const pickCompanyLogo = () => pickImage('Company Logo', setCompanyLogoUri);
  const pickAadhaarCard = () => pickImage('Aadhaar Card', setAadhaarCardUri);
  const pickCategoryDocument = (category: JobCategory, label: string) =>
    pickImage(label, (uri) => setCategoryDocumentUris((prev) => ({ ...prev, [category]: uri })));

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets?.[0]) {
      stageForPreview(toDataUri(result.assets[0]), 'Selfie', setSelfieUri);
    }
  };

  const confirmPreview = () => {
    if (previewUri) previewOnConfirmRef.current?.(previewUri);
    setPreviewUri(null);
    previewOnConfirmRef.current = null;
  };

  const cancelPreview = () => {
    setPreviewUri(null);
    previewOnConfirmRef.current = null;
  };

  const togglePreferredCategory = (category: JobCategory) => {
    setPreferredWorkCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
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
    if (requirePhone && !termsAccepted) {
      setError('Please accept the terms & privacy policy to continue.');
      return;
    }
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        phone: requirePhone ? `+91${phoneDigits}` : undefined,
        avatar: photoUri ?? undefined,
        email: emailValue || undefined,
        password: passwordValue || undefined,
        accountType,
        termsAccepted: termsAccepted || undefined,
        termsAcceptedAt: termsAccepted ? new Date().toISOString() : undefined,
        dateOfBirth: dobIso ?? undefined,
        gender: displayExtras ? gender : undefined,
        languages: displayExtras ? textToList(languagesText) : undefined,
        education: education.trim() || undefined,
        currentAddress: currentAddress.trim() || undefined,
        workerProfile: showWorkerProfile
          ? {
              skills: textToList(skillsText),
              experienceYears: textToNumber(experienceYears),
              preferredWorkCategories,
              workRadiusKm: textToNumber(workRadiusKm),
            }
          : undefined,
        employerProfile: showEmployerProfile
          ? {
              kind: employerKind,
              companyName: companyName.trim(),
              gstNumber: gstNumber.trim(),
              officeAddress: officeAddress.trim(),
              companyLogoUrl: companyLogoUri ?? '',
              companyVerificationRequested,
            }
          : undefined,
        kyc: displayExtras
          ? {
              aadhaarCardUrl: aadhaarCardUri ?? '',
              selfieUrl: selfieUri ?? '',
              drivingLicenseUrl: categoryDocumentUris.driver ?? categoryDocumentUris.delivery ?? '',
              categoryDocuments: requiredCategoryDocuments.map((document) => ({
                category: document.category,
                label: document.label,
                documentUrl: categoryDocumentUris[document.category] ?? '',
              })),
            }
          : undefined,
        wallet: displayExtras
          ? {
              upiId: upiId.trim(),
              bankAccountNumber: bankAccountNumber.trim(),
              bankAccountHolderName: bankAccountHolderName.trim(),
              ifscCode: ifscCode.trim().toUpperCase(),
              panNumber: panNumber.trim().toUpperCase(),
            }
          : undefined,
        location: location ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Try again.');
    }
  }, [
    accountType,
    aadhaarCardUri,
    bankAccountHolderName,
    bankAccountNumber,
    canSubmit,
    categoryDocumentUris,
    companyLogoUri,
    companyName,
    companyVerificationRequested,
    currentAddress,
    displayExtras,
    dobIso,
    education,
    employerKind,
    emailValue,
    experienceYears,
    gender,
    gstNumber,
    languagesText,
    location,
    name,
    officeAddress,
    onSubmit,
    panNumber,
    passwordValue,
    phoneDigits,
    photoUri,
    preferredWorkCategories,
    requirePhone,
    requiredCategoryDocuments,
    showEmployerProfile,
    showWorkerProfile,
    selfieUri,
    skillsText,
    termsAccepted,
    upiId,
    workRadiusKm,
    ifscCode,
  ]);

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

  return (
    <>
      {displayExtras && showProfileSection ? (
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
        </>
      ) : null}

      {showCoreFields ? (
        <Input label={t('yourName')} placeholder={t('namePlaceholder')} value={name} onChangeText={setName} icon="account-outline" />
      ) : null}

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

      {showCoreFields ? (
        <Input
          label={t('yourEmail')}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="email-outline"
          error={emailHasError ? 'Enter a valid email address' : undefined}
        />
      ) : null}

      {requirePhone ? (
        <Input
          label={t('yourPassword')}
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          // Was missing before — without it, the keyboard's default sentence-case auto-cap
          // could silently alter the first character typed, so what got saved wasn't
          // necessarily what the user thought they typed.
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="password-new"
          icon="lock-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((prev) => !prev)}
          rightIconAccessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          error={passwordHasError ? 'Password must be at least 6 characters' : undefined}
        />
      ) : null}

      {displayExtras && showProfileSection ? (
        <>
          <Text style={styles.sectionTitle}>Personal</Text>
          <View style={styles.dobWrapper}>
            <Text style={styles.dobLabel}>{t('yourDob')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('yourDob')} onPress={openDobPicker} style={styles.dobBox}>
              <MaterialCommunityIcons name="cake-variant-outline" size={20} color={theme.colors.textMuted} style={styles.dobIcon} />
              <Text style={dobDate ? styles.dobText : styles.dobPlaceholderText}>
                {dobDate ? formatDobDisplay(dobDate) : t('dobPlaceholder')}
              </Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          {Platform.OS !== 'android' && dobPickerVisible && (
            <DateTimePicker
              value={dobDate ?? getDefaultDobDate()}
              mode="date"
              maximumDate={new Date()}
              minimumDate={getMinDobDate()}
              onValueChange={(_event, date) => {
                if (date) setDobDate(toUtcMidnight(date));
              }}
              onDismiss={() => setDobPickerVisible(false)}
            />
          )}

          <Text style={styles.sectionLabel}>Gender</Text>
          <View style={styles.optionRow}>
            {genderOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: gender === option.value }}
                onPress={() => setGender(option.value)}
                style={[styles.optionButton, gender === option.value && styles.optionButtonActive]}
              >
                <Text style={[styles.optionLabel, gender === option.value && styles.optionLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            label="Languages"
            placeholder="Hindi, English"
            value={languagesText}
            onChangeText={setLanguagesText}
            icon="translate"
          />

          <Input
            label={t('yourCurrentAddress')}
            placeholder={t('currentAddressPlaceholder')}
            value={currentAddress}
            onChangeText={setCurrentAddress}
            icon="home-outline"
          />
        </>
      ) : null}

      {showCoreFields && !initialUser ? (
        <>
          {/* Only shown at registration — once an account exists, its type can only change
              via an admin-approved request (see AccountTypeScreen), not this form. */}
          <Text style={styles.sectionLabel}>{t('selectAccountType')}</Text>
          <View style={styles.accountTypeRow}>
            {(['worker', 'employer', 'both'] as AccountType[]).map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: accountType === type }}
                onPress={() => setAccountType(type)}
                style={[
                  styles.accountTypeButton,
                  accountType === type && styles.accountTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.accountTypeLabel,
                    accountType === type && styles.accountTypeLabelActive,
                  ]}
                >
                  {t(`${type}Account` as const)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {requirePhone ? (
        <Pressable
          style={styles.termsRow}
          onPress={() => setTermsAccepted((prev) => !prev)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted ? (
              <MaterialCommunityIcons name="check" size={16} color={theme.colors.textInverse} />
            ) : null}
          </View>
          <Text style={styles.termsText}>{t('acceptTerms')}</Text>
        </Pressable>
      ) : null}

      {showProfileSection && showWorkerProfile ? (
        <>
          <Text style={styles.sectionTitle}>Professional</Text>
          <Input
            label="Skills"
            placeholder="Cooking, electrical repair, driving"
            value={skillsText}
            onChangeText={setSkillsText}
            icon="toolbox-outline"
          />
          <Input
            label="Experience"
            placeholder="Years of experience"
            value={experienceYears}
            onChangeText={(value) => setExperienceYears(value.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            icon="briefcase-clock-outline"
          />
          <Input
            label={t('yourEducation')}
            placeholder={t('educationPlaceholder')}
            value={education}
            onChangeText={setEducation}
            icon="school-outline"
          />
          <Text style={styles.sectionLabel}>Preferred Work Category</Text>
          <View style={styles.categoryGroupList}>
            {categoryGroups.map((group) => {
              const expanded = expandedCategoryGroups.includes(group.key);
              const selectedCount = group.items.filter((item) =>
                preferredWorkCategories.includes(item.key)
              ).length;
              return (
                <View key={group.key} style={styles.categoryGroupBlock}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => toggleCategoryGroup(group.key)}
                    style={({ pressed }) => [styles.categoryGroupHeader, pressed && styles.pressed]}
                  >
                    <Text style={styles.categoryGroupTitle}>{group.name}</Text>
                    {selectedCount > 0 ? (
                      <View style={styles.categoryGroupCount}>
                        <Text style={styles.categoryGroupCountText}>{selectedCount}</Text>
                      </View>
                    ) : null}
                    <MaterialCommunityIcons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={theme.colors.textMuted}
                    />
                  </Pressable>
                  {expanded ? (
                    <View style={[styles.optionRow, styles.categoryGroupOptions]}>
                      {group.items.map((category) => {
                        const selected = preferredWorkCategories.includes(category.key);
                        return (
                          <Pressable
                            key={category.key}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => togglePreferredCategory(category.key)}
                            style={[styles.optionButton, selected && styles.optionButtonActive]}
                          >
                            <MaterialCommunityIcons
                              name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                              size={16}
                              color={selected ? theme.colors.textInverse : theme.colors.textSecondary}
                            />
                            <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>
                              {category.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <Input
            label="Work Radius"
            placeholder="Distance in km"
            value={workRadiusKm}
            onChangeText={(value) => setWorkRadiusKm(value.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            icon="map-marker-distance"
          />
        </>
      ) : null}

      {showProfileSection && showEmployerProfile ? (
        <>
          <Text style={styles.sectionTitle}>Employer Profile</Text>
          <Text style={styles.sectionLabel}>Employer Type</Text>
          <View style={styles.optionRow}>
            {employerKindOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: employerKind === option.value }}
                onPress={() => setEmployerKind(option.value)}
                style={[styles.optionButton, employerKind === option.value && styles.optionButtonActive]}
              >
                <Text style={[styles.optionLabel, employerKind === option.value && styles.optionLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Company Name"
            placeholder="Enter company name"
            value={companyName}
            onChangeText={setCompanyName}
            icon="domain"
          />
          <Input
            label="GST (optional)"
            placeholder="Enter GST number"
            value={gstNumber}
            onChangeText={(value) => setGstNumber(value.toUpperCase())}
            autoCapitalize="characters"
            icon="file-document-outline"
          />
          <Input
            label="Office Address"
            placeholder="Office no, street, area"
            value={officeAddress}
            onChangeText={setOfficeAddress}
            icon="office-building-marker-outline"
          />
          <Text style={styles.sectionLabel}>Company Logo (optional)</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Company Logo"
            onPress={pickCompanyLogo}
            style={({ pressed }) => [styles.logoPicker, pressed && styles.pressed]}
          >
            {companyLogoUri ? (
              <Image source={{ uri: companyLogoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={24} color={theme.colors.primary} />
              </View>
            )}
            <Text style={styles.logoText}>{companyLogoUri ? 'Change logo' : 'Add company logo'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: companyVerificationRequested }}
            onPress={() => setCompanyVerificationRequested((prev) => !prev)}
            style={styles.termsRow}
          >
            <View style={[styles.checkbox, companyVerificationRequested && styles.checkboxChecked]}>
              {companyVerificationRequested ? (
                <MaterialCommunityIcons name="check" size={16} color={theme.colors.textInverse} />
              ) : null}
            </View>
            <Text style={styles.termsText}>Request company verification (optional)</Text>
          </Pressable>
        </>
      ) : null}

      {showKycSection || showWalletSection ? (
        <>
          {showKycSection ? (
            kycApproved ? (
              <>
                <Text style={styles.sectionTitle}>KYC</Text>
                <View style={styles.completedBanner}>
                  <MaterialCommunityIcons name="check-decagram" size={22} color={theme.colors.success} />
                  <Text style={styles.completedBannerText}>KYC completed</Text>
                </View>
                <DocumentSummaryRow icon="card-account-details-outline" label="Aadhaar Card" added={!!aadhaarCardUri} />
                <DocumentSummaryRow icon="face-man-shimmer-outline" label="Selfie" added={!!selfieUri} />
                {requiredCategoryDocuments.map((document) => (
                  <DocumentSummaryRow
                    key={document.category}
                    icon={getCategoryDocumentIcon(document.category)}
                    label={document.label}
                    added={!!categoryDocumentUris[document.category]}
                  />
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>KYC</Text>
                <ReviewStatusNotice
                  status={initialUser?.kyc?.status}
                  rejectionReason={initialUser?.kyc?.rejectionReason}
                  label="KYC"
                />
                <DocumentUploadRow
                  icon="card-account-details-outline"
                  label="Aadhaar Card"
                  value={aadhaarCardUri}
                  actionLabel={aadhaarCardUri ? 'Change' : 'Upload'}
                  onPress={pickAadhaarCard}
                />
                <DocumentUploadRow
                  icon="face-man-shimmer-outline"
                  label="Selfie"
                  value={selfieUri}
                  actionLabel={selfieUri ? 'Retake' : 'Take Selfie'}
                  onPress={takeSelfie}
                />
                {showWorkerProfile && requiredCategoryDocuments.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>Category Documents</Text>
                    {requiredCategoryDocuments.map((document) => {
                      const documentUri = categoryDocumentUris[document.category] ?? null;
                      return (
                        <DocumentUploadRow
                          key={document.category}
                          icon={getCategoryDocumentIcon(document.category)}
                          label={document.label}
                          value={documentUri}
                          actionLabel={documentUri ? 'Change' : 'Upload'}
                          onPress={() => pickCategoryDocument(document.category, document.label)}
                        />
                      );
                    })}
                  </>
                ) : null}
              </>
            )
          ) : null}

          {showWalletSection ? (
            <>
              <Text style={styles.sectionTitle}>Wallet Setup</Text>
              <ReviewStatusNotice
                status={initialUser?.wallet?.status}
                rejectionReason={initialUser?.wallet?.rejectionReason}
                label="Wallet"
              />
              <Input
                label="UPI"
                placeholder="name@bank"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                icon="qrcode-scan"
              />
              <Input
                label="Bank Account Number"
                placeholder="Enter account number"
                value={bankAccountNumber}
                onChangeText={(value) => setBankAccountNumber(value.replace(/\D/g, ''))}
                keyboardType="number-pad"
                icon="bank-outline"
              />
              <Input
                label="Account Holder Name"
                placeholder="Enter account holder name"
                value={bankAccountHolderName}
                onChangeText={setBankAccountHolderName}
                icon="account-tie-outline"
              />
              <Input
                label="IFSC"
                placeholder="IFSC code"
                value={ifscCode}
                onChangeText={(value) => setIfscCode(value.toUpperCase())}
                autoCapitalize="characters"
                icon="identifier"
              />
              <Input
                label="PAN Card (optional)"
                placeholder="PAN number"
                value={panNumber}
                onChangeText={(value) => setPanNumber(value.toUpperCase())}
                autoCapitalize="characters"
                icon="card-text-outline"
              />
            </>
          ) : null}
        </>
      ) : null}

      {showCoreFields ? (
        <>
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
        </>
      ) : null}

      {!kycApproved ? (
        <>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button label={submitLabel} onPress={handleSubmit} disabled={!canSubmit} loading={submitting} fullWidth style={styles.submitButton} />
        </>
      ) : null}

      <LocationPickerModal
        visible={mapVisible}
        initialLocation={location}
        onClose={() => setMapVisible(false)}
        onConfirm={(loc) => {
          setLocation(loc);
          setMapVisible(false);
        }}
      />

      <ImagePreviewModal
        visible={!!previewUri}
        uri={previewUri}
        title={previewTitle}
        onCancel={cancelPreview}
        onConfirm={confirmPreview}
      />
    </>
  );
});

const ReviewStatusNotice: React.FC<{
  status?: ReviewStatus;
  rejectionReason?: string;
  label: string;
}> = ({ status, rejectionReason, label }) => {
  if (!status || status === 'not_started') return null;

  const isApproved = status === 'verified';
  const isRejected = status === 'rejected';
  const icon = isApproved ? 'check-circle-outline' : isRejected ? 'alert-circle-outline' : 'clock-outline';
  const color = isApproved ? theme.colors.success : isRejected ? theme.colors.danger : theme.colors.warning;
  const title = isApproved ? `${label} approved` : isRejected ? `${label} rejected` : `${label} under review`;
  const body = isApproved
    ? 'Admin approval complete.'
    : isRejected
      ? rejectionReason || 'Please update details and submit again.'
      : 'Admin review me hai. Usually 24 hours ke andar update milega.';

  return (
    <View style={[styles.reviewNotice, { borderColor: `${color}55` }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <View style={styles.reviewNoticeCopy}>
        <Text style={[styles.reviewNoticeTitle, { color }]}>{title}</Text>
        <Text style={styles.reviewNoticeBody}>{body}</Text>
      </View>
    </View>
  );
};

const DocumentUploadRow: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value?: string | null;
  actionLabel: string;
  optional?: boolean;
  onPress: () => void;
}> = ({ icon, label, value, actionLabel, optional, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.documentRow, pressed && styles.pressed]}
  >
    <View style={[styles.documentIcon, value && styles.documentIconDone]}>
      <MaterialCommunityIcons name={value ? 'check' : icon} size={22} color={value ? theme.colors.textInverse : theme.colors.primary} />
    </View>
    <View style={styles.documentCopy}>
      <Text style={styles.documentTitle}>{optional ? `${label} (optional)` : label}</Text>
      <Text style={styles.documentStatus}>{value ? 'Added' : 'Not added'}</Text>
    </View>
    <Text style={styles.documentAction}>{actionLabel}</Text>
  </Pressable>
);

const DocumentSummaryRow: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  added: boolean;
}> = ({ icon, label, added }) => (
  <View style={styles.documentRow}>
    <View style={[styles.documentIcon, added && styles.documentIconDone]}>
      <MaterialCommunityIcons name={added ? 'check' : icon} size={22} color={added ? theme.colors.textInverse : theme.colors.primary} />
    </View>
    <View style={styles.documentCopy}>
      <Text style={styles.documentTitle}>{label}</Text>
      <Text style={styles.documentStatus}>{added ? 'Added' : 'Not added'}</Text>
    </View>
  </View>
);

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
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryGroupList: {
    marginBottom: theme.spacing.md,
  },
  categoryGroupBlock: {
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  categoryGroupCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGroupCountText: {
    ...theme.typography.tiny,
    color: theme.colors.textInverse,
    fontWeight: '800',
  },
  categoryGroupTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '800',
    flex: 1,
  },
  categoryGroupOptions: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    marginBottom: 0,
  },
  optionButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  optionLabelActive: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  dobWrapper: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.md,
  },
  dobLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  dobBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  dobIcon: {
    marginRight: theme.spacing.xs,
  },
  dobText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  dobPlaceholderText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    flex: 1,
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
  logoPicker: {
    minHeight: 64,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  documentRow: {
    minHeight: 62,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentIconDone: {
    backgroundColor: theme.colors.success,
  },
  documentCopy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  documentTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  documentStatus: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  documentAction: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: `${theme.colors.success}55`,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successLight,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  completedBannerText: {
    ...theme.typography.bodyBold,
    color: theme.colors.success,
  },
  reviewNoticeCopy: {
    flex: 1,
  },
  reviewNoticeTitle: {
    ...theme.typography.bodyBold,
  },
  reviewNoticeBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.76,
  },
  accountTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  accountTypeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  accountTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  accountTypeLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  accountTypeLabelActive: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termsText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
});
