import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const OTP_LENGTH = 4;

export const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, phoneNumber, confirmOtp, requestOtp, remoteSettings } = useApp();
  const [demoOtp, setDemoOtp] = useState(route.params.demoOtp);
  const [otp, setOtp] = useState('');
  const [errorText, setErrorText] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const content = remoteSettings['mobile.authFlow.content']?.otpVerification;
  const title = content?.title || t('verifyOtp');
  const otpSentToLabel = content?.otpSentToLabel || t('otpSentTo');
  const resendLabel = content?.resendLabel || t('resendOtp');
  const verifyLabel = content?.verifyLabel || t('verify');

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
    setErrorText('');
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    try {
      await confirmOtp(otp);
      // RootNavigator reacts when auth state flips after OTP verification.
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Incorrect code. Please try again.';
      setErrorText(
        message.includes('No account found')
          ? 'This phone number is not registered. Please register first.'
          : message
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setErrorText('');
    try {
      const { demoOtp: newOtp } = await requestOtp(phoneNumber);
      setDemoOtp(newOtp);
    } catch {
      // best-effort resend; user can retry via the button again
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color={theme.colors.secondary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {otpSentToLabel} {phoneNumber || '+91 XXXXX XXXXX'}
        </Text>
        <Text style={styles.hint}>(Demo code: {demoOtp})</Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpBoxRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.otpBox, !!errorText && styles.otpBoxError, otp[i] && styles.otpBoxFilled]}>
              <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          accessibilityLabel={t('verifyOtp')}
        />

        {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
        {errorText.includes('not registered') ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ProfileSetup')}
            style={styles.registerPromptBtn}
          >
            <Text style={styles.registerPromptText}>Register Now</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={handleResend} style={styles.resendBtn}>
          <Text style={styles.resendText}>{resendLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Button
          label={verifyLabel}
          onPress={handleVerify}
          disabled={otp.length !== OTP_LENGTH}
          loading={verifying}
          fullWidth
        />
        <Pressable onPress={() => navigation.goBack()} style={styles.changeNumberBtn}>
          <Text style={styles.changeNumberText}>{t('changeNumber')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.accentDark,
    marginTop: theme.spacing.xs,
  },
  otpBoxRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  otpBoxFilled: {
    borderColor: theme.colors.primary,
  },
  otpBoxError: {
    borderColor: theme.colors.danger,
  },
  otpDigit: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  registerPromptBtn: {
    minHeight: theme.MIN_TAP_TARGET,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  registerPromptText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  resendBtn: {
    marginTop: theme.spacing.lg,
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  resendText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    marginTop: 'auto',
  },
  changeNumberBtn: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  changeNumberText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
