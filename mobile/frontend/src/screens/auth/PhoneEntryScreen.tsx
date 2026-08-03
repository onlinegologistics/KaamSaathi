import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;
type SocialIcon = 'google' | 'facebook' | 'apple';

export const PhoneEntryScreen: React.FC<Props> = ({ navigation }) => {
  const { t, requestOtp, remoteSettings } = useApp();
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const content = remoteSettings['mobile.authFlow.content']?.phoneEntry;
  const title = content?.title || 'Enter your phone number';
  const subtitle = content?.subtitle || "We'll send you a verification code";
  const sendOtpLabel = content?.sendOtpLabel || t('sendOtp');

  const isValid = digits.length === 10;

  const handleSend = async () => {
    if (!isValid || sending) return;
    setSending(true);
    setError('');
    try {
      const { demoOtp } = await requestOtp(`+91${digits}`);
      navigation.navigate('OtpVerification', { demoOtp });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send OTP. Try again.';
      setError(
        message.includes('No account found')
          ? 'This phone number is not registered. Please register first.'
          : message
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer backgroundColor="#FFFDF8">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.screen}>
          <LinearGradient
            colors={['#FFD7BF', '#FFF2E8', '#FFFDF8']}
            locations={[0, 0.45, 1]}
            style={styles.glow}
          />

          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.iconHaloOuter}>
              <View style={styles.iconHaloInner}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="cellphone-message" size={36} color={theme.colors.primary} />
                </View>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <Pressable
              style={styles.inputRow}
              accessibilityRole="button"
              accessibilityLabel={t('phoneNumber')}
              onPress={() => inputRef.current?.focus()}
            >
              <View style={styles.countryCode}>
                <View style={styles.flag}>
                  <View style={[styles.flagStripe, styles.flagSaffron]} />
                  <View style={[styles.flagStripe, styles.flagWhite]} />
                  <View style={[styles.flagStripe, styles.flagGreen]} />
                </View>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                ref={inputRef}
                value={digits}
                onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your phone number"
                placeholderTextColor="#B8B2AA"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={10}
                autoFocus
                style={styles.numberInput}
              />
            </Pressable>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {error.includes('not registered') ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ProfileSetup')}
                style={styles.registerPromptBtn}
              >
                <Text style={styles.registerPromptText}>Register Now</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sendOtpLabel}
              onPress={handleSend}
              disabled={!isValid || sending}
              style={({ pressed }) => [
                styles.otpButton,
                (!isValid || sending) && styles.disabled,
                pressed && isValid && !sending && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={['#FF5A1A', '#FF8559']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.otpGradient}
              >
                <Text style={styles.otpButtonText}>{sending ? 'Sending...' : sendOtpLabel}</Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.continueText}>Or continue with</Text>

            <View style={styles.socialRow}>
              <SocialButton icon="google" />
              <SocialButton icon="facebook" />
              <SocialButton icon="apple" />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => navigation.navigate('ProfileSetup')}
            >
              <Text style={styles.footerLink}>Register</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const SocialButton: React.FC<{ icon: SocialIcon }> = ({ icon }) => {
  const iconColor = icon === 'google' ? '#4285F4' : icon === 'facebook' ? '#1877F2' : '#111111';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${icon}`}
      style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
    >
      {icon === 'google' ? (
        <GoogleMark />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      )}
    </Pressable>
  );
};

const GoogleMark = () => (
  <Svg width={22} height={22} viewBox="0 0 48 48" accessibilityLabel="Google">
    <Path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <Path
      fill="#FF3D00"
      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <Path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <Path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </Svg>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -120,
    left: -96,
    right: -28,
    height: 370,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 190,
  },
  header: {
    minHeight: 58,
    justifyContent: 'center',
  },
  backButton: {
    width: theme.MIN_TAP_TARGET,
    height: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingTop: 42,
  },
  iconHaloOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconHaloInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 3,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  inputRow: {
    width: '100%',
    minHeight: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 36,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  countryCode: {
    width: 82,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#F0EBE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  flag: {
    width: 19,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E1DDD8',
    overflow: 'hidden',
  },
  flagStripe: {
    flex: 1,
  },
  flagSaffron: {
    backgroundColor: '#FF9933',
  },
  flagWhite: {
    backgroundColor: '#FFFFFF',
  },
  flagGreen: {
    backgroundColor: '#138808',
  },
  countryCodeText: {
    ...theme.typography.tiny,
    color: theme.colors.text,
    fontWeight: '800',
  },
  numberInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 0,
    ...theme.typography.tiny,
    color: theme.colors.text,
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
  otpButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: theme.radius.sm,
    marginTop: 28,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
  otpGradient: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpButtonText: {
    ...theme.typography.tiny,
    color: theme.colors.textInverse,
    fontWeight: '800',
  },
  continueText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
    marginTop: 48,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 18,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 2,
  },
  footer: {
    minHeight: 80,
    marginTop: 'auto',
    paddingBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    ...theme.typography.tiny,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
