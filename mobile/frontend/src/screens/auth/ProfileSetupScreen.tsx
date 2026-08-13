import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { GoogleMark } from '../../components/GoogleMark';
import { ProfileForm, ProfileFormValues } from '../../components/ProfileForm';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';
import { signInWithGoogle } from '../../services/socialAuth';
import { AccountType } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export const ProfileSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { startRegistration, registerWithOAuth, loginWithOAuth, remoteSettings } = useApp();
  const [prefill, setPrefill] = useState<{ name?: string; email?: string }>({
    name: route.params?.prefillName,
    email: route.params?.prefillEmail,
  });
  // Only set once a fresh Google sign-in succeeds on THIS screen (idToken is short-lived and
  // never passed via navigation params) — its presence switches to the one-tap register card.
  const [googleProfile, setGoogleProfile] = useState<{ idToken: string; name: string; email: string } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [quickPhoneDigits, setQuickPhoneDigits] = useState('');
  const [quickAccountType, setQuickAccountType] = useState<AccountType | null>(null);
  const [quickTermsAccepted, setQuickTermsAccepted] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');
  const content = remoteSettings['mobile.authFlow.content']?.profileSetup;
  const title = content?.title || 'Register';
  const finishLabel = content?.finishLabel || 'Send OTP';
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleContinue = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const { idToken, name, email } = await signInWithGoogle();
      try {
        // Try logging in first — if this Google email already has an account, sign straight
        // into it instead of dead-ending on a "please login instead" error.
        await loginWithOAuth('google', idToken);
        return;
      } catch (loginError) {
        const loginMessage = loginError instanceof Error ? loginError.message : '';
        if (!loginMessage.includes('No account found')) throw loginError;
      }
      setGoogleProfile({ idToken, name, email });
      setPrefill({ name, email });
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : 'Could not continue with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const canQuickSubmit = quickPhoneDigits.length === 10 && !!quickAccountType && quickTermsAccepted;

  const handleQuickRegister = async () => {
    if (!googleProfile || !quickAccountType || !canQuickSubmit || quickSubmitting) return;
    setQuickSubmitting(true);
    setQuickError('');
    try {
      await registerWithOAuth('google', googleProfile.idToken, `+91${quickPhoneDigits}`, quickAccountType);
      // RootNavigator reacts when auth state flips after registration.
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : 'Could not create your account. Try again.');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleLoginInsteadFromQuick = async () => {
    if (!googleProfile || quickSubmitting) return;
    setQuickSubmitting(true);
    setQuickError('');
    try {
      await loginWithOAuth('google', googleProfile.idToken);
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : 'Could not log in. Try again.');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!values.phone) return;
    setSubmitting(true);
    try {
      const { demoOtp } = await startRegistration(values.phone, {
        name: values.name,
        avatar: values.avatar,
        email: values.email,
        password: values.password,
        accountType: values.accountType,
        termsAccepted: values.termsAccepted,
        termsAcceptedAt: values.termsAcceptedAt,
        dateOfBirth: values.dateOfBirth,
        education: values.education,
        currentAddress: values.currentAddress,
        location: values.location,
      });
      navigation.navigate('OtpVerification', { demoOtp });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {googleProfile ? (
          <View style={styles.quickCard}>
            <View style={styles.quickProfileRow}>
              <MaterialCommunityIcons name="account-circle" size={40} color={theme.colors.primary} />
              <View style={styles.quickProfileText}>
                <Text style={styles.quickName} numberOfLines={1}>
                  {googleProfile.name || 'Google Account'}
                </Text>
                <Text style={styles.quickEmail} numberOfLines={1}>
                  {googleProfile.email}
                </Text>
              </View>
            </View>

            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              value={quickPhoneDigits}
              onChangeText={(value) => setQuickPhoneDigits(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={10}
              icon="cellphone"
              error={
                quickPhoneDigits.length > 0 && quickPhoneDigits.length !== 10
                  ? 'Enter a valid 10 digit phone number'
                  : undefined
              }
            />

            <View style={styles.accountTypeSection}>
              <Text style={styles.sectionLabel}>Account Type</Text>
              <View style={styles.accountTypeRow}>
                {(
                  [
                    { type: 'worker', label: 'Worker', icon: 'account-hard-hat' },
                    { type: 'employer', label: 'Employer', icon: 'briefcase-account' },
                    { type: 'both', label: 'Both', icon: 'swap-horizontal' },
                  ] as const
                ).map((item) => {
                  const selected = quickAccountType === item.type;
                  return (
                    <Pressable
                      key={item.type}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setQuickAccountType(item.type)}
                      style={[styles.accountTypeButton, selected && styles.accountTypeButtonActive]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={18}
                        color={selected ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <Text style={[styles.accountTypeLabel, selected && styles.accountTypeLabelActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: quickTermsAccepted }}
              onPress={() => setQuickTermsAccepted((prev) => !prev)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, quickTermsAccepted && styles.checkboxChecked]}>
                {quickTermsAccepted ? (
                  <MaterialCommunityIcons name="check" size={16} color={theme.colors.textInverse} />
                ) : null}
              </View>
              <Text style={styles.termsText}>I accept the terms & privacy policy</Text>
            </Pressable>

            {!!quickError && <Text style={styles.errorText}>{quickError}</Text>}
            {quickError.includes('login instead') ? (
              <Button
                label="Login Instead"
                onPress={handleLoginInsteadFromQuick}
                loading={quickSubmitting}
                fullWidth
                style={styles.quickSubmitButton}
              />
            ) : (
              <Button
                label="Create Account"
                onPress={handleQuickRegister}
                disabled={!canQuickSubmit}
                loading={quickSubmitting}
                fullWidth
                style={styles.quickSubmitButton}
              />
            )}

            <Text style={styles.quickHint}>
              You're all set — add photos, skills, location and more from your profile anytime.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setGoogleProfile(null)}
              style={styles.manualLinkBtn}
            >
              <Text style={styles.manualLinkText}>Register manually instead</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Button
              label="Continue with Google"
              onPress={handleGoogleContinue}
              variant="outline"
              loading={googleLoading}
              icon={<GoogleMark size={20} />}
              fullWidth
              style={styles.googleButton}
            />
            {!!googleError && <Text style={styles.errorText}>{googleError}</Text>}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or fill in manually</Text>
              <View style={styles.dividerLine} />
            </View>

            <ProfileForm
              // Remounts the form (fresh initial state) whenever a prefill arrives — plain
              // props can't update ProfileForm's internal useState after mount.
              key={prefill.email ?? 'manual'}
              initialName={prefill.name}
              initialEmail={prefill.email}
              submitLabel={finishLabel}
              submitting={submitting}
              requirePhone
              onSubmit={handleSubmit}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  googleButton: {
    borderColor: theme.colors.border,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  quickCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  quickProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  quickProfileText: {
    flex: 1,
  },
  quickName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  quickEmail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  accountTypeSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  accountTypeButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
  accountTypeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  accountTypeLabel: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    textAlign: 'center',
  },
  accountTypeLabelActive: {
    color: theme.colors.primary,
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
  quickSubmitButton: {
    marginTop: theme.spacing.xs,
  },
  quickHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  manualLinkBtn: {
    alignSelf: 'center',
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  manualLinkText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
