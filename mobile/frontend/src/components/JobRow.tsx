import React from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Job } from '../types';
import { getCategoryMeta } from '../data/categories';
import { useApp } from '../context/AppContext';

interface JobRowProps {
  job: Job;
  onPress: () => void;
  onApply: () => void;
}

// Compact list row used by the job listings — icon tile, copy stack, apply pill.
export const JobRow: React.FC<JobRowProps> = ({ job, onPress, onApply }) => {
  const { t, currentUser, appliedJobIds, categories } = useApp();
  const hasApplied = appliedJobIds.includes(job.id);
  const isOwnJob = !!currentUser && job.posterId === currentUser.id;
  const cannotApply = currentUser?.accountType === 'employer';
  const meta = getCategoryMeta(job.category, categories);
  const handleApply = () => {
    Promise.resolve(onApply()).catch((error) => {
      Alert.alert('Action needed', error instanceof Error ? error.message : 'Please try again.');
    });
  };

  const paySuffix = job.payType === 'day' ? t('perDay') : job.payType === 'hour' ? t('perHour') : '';
  const payLabel = `₹${job.pay}${paySuffix}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={job.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconTile, { backgroundColor: `${meta.color}1A` }]}>
        <MaterialCommunityIcons
          name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={26}
          color={meta.color}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${job.location.label} • ${job.startTimeLabel} • ${job.durationLabel}`}
        </Text>
        <Text style={styles.pay}>{payLabel}</Text>
      </View>

      {isOwnJob ? (
        <View style={[styles.applyBtn, styles.ownJobBadge]}>
          <Text style={styles.ownJobText}>Your Post</Text>
        </View>
      ) : cannotApply ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasApplied ? t('applied') : t('applyNow')}
          onPress={handleApply}
          disabled={hasApplied}
          style={({ pressed }) => [styles.applyBtn, hasApplied && styles.applyBtnDone, pressed && !hasApplied && styles.pressed]}
        >
          <Text style={[styles.applyText, hasApplied && styles.applyTextDone]}>
            {hasApplied ? t('applied') : t('applyNow')}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pay: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginTop: 3,
  },
  applyBtn: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  applyBtnDone: {
    backgroundColor: theme.colors.successLight,
  },
  ownJobBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ownJobText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  applyText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  applyTextDone: {
    color: theme.colors.success,
  },
});
