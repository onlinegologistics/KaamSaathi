import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { ProfileForm, ProfileFormValues } from '../../components/ProfileForm';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export const ProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { startRegistration, remoteSettings } = useApp();
  const content = remoteSettings['mobile.authFlow.content']?.profileSetup;
  const title = content?.title || 'Register';
  const finishLabel = content?.finishLabel || 'Send OTP';
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!values.phone) return;
    setSubmitting(true);
    try {
      const { demoOtp } = await startRegistration(values.phone, {
        name: values.name,
        avatar: values.avatar,
        email: values.email,
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
        <ProfileForm
          submitLabel={finishLabel}
          submitting={submitting}
          requirePhone
          onSubmit={handleSubmit}
        />
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
});
