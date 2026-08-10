import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { JobForm } from '../../components/JobForm';
import { useApp } from '../../context/AppContext';
import { createJob, CreateJobPayload } from '../../services/api';
import { PostStackParamList } from '../../navigation/types';
import { isKycComplete, isProfileComplete } from '../../utils/profileCompletion';

type Props = NativeStackScreenProps<PostStackParamList, 'PostJob'>;

export const PostJobScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken, currentUser } = useApp();
  const [posting, setPosting] = useState(false);
  const profileReady = isProfileComplete(currentUser);
  const kycReady = isKycComplete(currentUser);
  const kycStatus = currentUser?.kyc?.status;
  const kycTitle = !profileReady
    ? 'Complete profile first'
    : kycStatus === 'submitted'
      ? 'KYC under review'
      : kycStatus === 'rejected'
        ? 'KYC rejected'
        : 'Complete KYC to post jobs';
  const kycBody = !profileReady
    ? 'Profile complete karne ke baad KYC start hoga.'
    : kycStatus === 'submitted'
      ? 'Admin review me hai. Usually 24 hours ke andar update milega.'
      : kycStatus === 'rejected'
        ? 'Please update your KYC details and submit again.'
        : 'Add Aadhaar, selfie and required documents from your profile.';
  const kycButtonLabel = profileReady ? 'View KYC' : 'Complete Profile';

  // The floating bottom tab bar is absolutely positioned and otherwise
  // overlaps this screen's footer button — hide it while this screen is
  // focused, same as the Search/Chat screens do.
  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const handleSubmit = async (payload: CreateJobPayload) => {
    if (!accessToken || !kycReady) return;
    setPosting(true);
    try {
      await createJob(accessToken, payload);
      navigation.reset({ index: 0, routes: [{ name: 'PostSuccess' }] });
    } finally {
      setPosting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t('postAJob')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {kycReady ? (
          <JobForm submitLabel={t('postJob')} submitting={posting} onSubmit={handleSubmit} />
        ) : (
          <View style={styles.kycCard}>
            <View style={styles.kycIcon}>
              <MaterialCommunityIcons name="shield-alert-outline" size={30} color={theme.colors.primary} />
            </View>
            <Text style={styles.kycTitle}>{kycTitle}</Text>
            <Text style={styles.kycBody}>{kycBody}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('ProfileTab', { screen: 'EditProfile', params: { section: profileReady ? 'kyc' : 'profile' } } as never)
              }
              style={({ pressed }) => [styles.kycButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="plus" size={18} color={theme.colors.textInverse} />
              <Text style={styles.kycButtonText}>{kycButtonLabel}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  kycCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  kycIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  kycTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
  },
  kycBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  kycButton: {
    minHeight: theme.MIN_TAP_TARGET,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  kycButtonText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.74,
  },
});
