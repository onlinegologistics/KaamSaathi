import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { AccountType } from '../../types';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AccountType'>;

const TYPE_META: Record<AccountType, { label: string; body: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  worker: { label: 'Worker', body: 'Find jobs and apply to work near you.', icon: 'account-hard-hat' },
  employer: { label: 'Employer', body: 'Post jobs and hire verified workers.', icon: 'briefcase-outline' },
  both: { label: 'Both', body: 'Find work and post jobs from one account.', icon: 'swap-horizontal' },
};

export const AccountTypeScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, requestAccountTypeChange, cancelAccountTypeChangeRequest } = useApp();
  const currentType = currentUser?.accountType ?? 'worker';
  const change = currentUser?.accountTypeChange;
  const isPending = change?.status === 'pending';

  const [selected, setSelected] = useState<AccountType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const otherTypes = (['worker', 'employer', 'both'] as AccountType[]).filter((type) => type !== currentType);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await requestAccountTypeChange(selected);
      Alert.alert('Request sent', 'An admin will review your account type change request.');
      setSelected(null);
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel request?', 'Your pending account type change request will be withdrawn.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelAccountTypeChangeRequest();
          } catch (e) {
            Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Account Type</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Current account type</Text>
        <View style={styles.currentCard}>
          <View style={styles.currentIcon}>
            <MaterialCommunityIcons name={TYPE_META[currentType].icon} size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.currentCopy}>
            <Text style={styles.currentTitle}>{TYPE_META[currentType].label}</Text>
            <Text style={styles.currentBody}>{TYPE_META[currentType].body}</Text>
          </View>
        </View>

        {isPending ? (
          <>
            <View style={styles.pendingNotice}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.warning} />
              <View style={styles.pendingCopy}>
                <Text style={styles.pendingTitle}>
                  Request pending: change to {change?.requestedType ? TYPE_META[change.requestedType].label : ''}
                </Text>
                <Text style={styles.pendingBody}>An admin needs to approve this before it takes effect.</Text>
              </View>
            </View>
            <Button
              label="Cancel Request"
              onPress={handleCancel}
              variant="outline"
              loading={cancelling}
              fullWidth
              style={styles.cancelBtn}
            />
          </>
        ) : (
          <>
            {change?.status === 'rejected' && (
              <View style={styles.rejectedNotice}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.danger} />
                <View style={styles.pendingCopy}>
                  <Text style={styles.rejectedTitle}>Last request was rejected</Text>
                  <Text style={styles.pendingBody}>
                    {change.rejectionReason || 'You can submit a new request below.'}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>Request a change to</Text>
            {otherTypes.map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === type }}
                onPress={() => setSelected(type)}
                style={[styles.optionCard, selected === type && styles.optionCardActive]}
              >
                <View style={[styles.currentIcon, selected === type && styles.optionIconActive]}>
                  <MaterialCommunityIcons
                    name={TYPE_META[type].icon}
                    size={24}
                    color={selected === type ? theme.colors.textInverse : theme.colors.primary}
                  />
                </View>
                <View style={styles.currentCopy}>
                  <Text style={styles.currentTitle}>{TYPE_META[type].label}</Text>
                  <Text style={styles.currentBody}>{TYPE_META[type].body}</Text>
                </View>
                {selected === type && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
                )}
              </Pressable>
            ))}

            <Button
              label="Submit Request"
              onPress={handleSubmit}
              disabled={!selected}
              loading={submitting}
              fullWidth
              style={styles.submitBtn}
            />
          </>
        )}
      </View>
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
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  sectionLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  currentIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCopy: {
    flex: 1,
  },
  currentTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  currentBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: '#FFF3CF',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.warning}55`,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}55`,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  pendingCopy: {
    flex: 1,
  },
  pendingTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  rejectedTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.danger,
  },
  pendingBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: theme.spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionIconActive: {
    backgroundColor: theme.colors.primary,
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
});
