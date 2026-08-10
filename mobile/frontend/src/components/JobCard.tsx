import React from 'react';
import { Alert, View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Job } from '../types';
import { Avatar } from './Avatar';
import { useApp } from '../context/AppContext';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onApply: () => void;
}

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const startLabel = (job: Job) => {
  const day = job.isToday ? 'Today' : new Date(job.startAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day} • ${job.startTimeLabel}`;
};

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, onApply }) => {
  const { t, bookmarkedJobIds, toggleBookmark, appliedJobIds } = useApp();
  const isBookmarked = bookmarkedJobIds.includes(job.id);
  const hasApplied = appliedJobIds.includes(job.id);

  const payLabel =
    job.payType === 'fixed' ? `\u20b9${job.pay}` : `\u20b9${job.pay}${job.payType === 'day' ? t('perDay') : t('perHour')}`;

  const handleShare = () => {
    Share.share({
      message: `${job.title} - ${payLabel} - ${job.location.label} (via AnyWork)`,
    }).catch(() => {});
  };

  const handleApply = () => {
    Promise.resolve(onApply()).catch((error) => {
      Alert.alert('Action needed', error instanceof Error ? error.message : 'Please try again.');
    });
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={job.title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Avatar uri={job.poster.avatar} name={job.poster.name} size={54} verified={job.poster.verified} />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {job.poster.name}
          </Text>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {job.location.label}
            </Text>
            <MaterialCommunityIcons name="clock-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{timeAgo(job.postedAt)}</Text>
          </View>
        </View>
        <View style={styles.ratingPill}>
          <MaterialCommunityIcons name="star" size={14} color={theme.colors.success} />
          <Text style={styles.ratingText}>{job.poster.verified ? '4.8' : '4.6'}</Text>
        </View>
      </View>

      <View style={styles.payBadge}>
        <MaterialCommunityIcons name="cash-fast" size={16} color={theme.colors.accentDark} />
        <Text style={styles.payText}>{payLabel}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.statsRow}>
        <Stat icon="calendar-clock-outline" text={startLabel(job)} />
        <Stat icon="timer-outline" text={job.durationLabel} />
        <Stat icon="map-marker-distance" text={`${job.distanceKm} km away`} />
        <Stat icon="account-group-outline" text={`${job.peopleNeeded} needed`} />
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasApplied ? t('applied') : t('applyNow')}
          onPress={handleApply}
          disabled={hasApplied}
          style={({ pressed }) => [
            styles.applyBtn,
            hasApplied && styles.applyBtnDone,
            pressed && !hasApplied && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name={hasApplied ? 'check-circle' : 'send'} size={18} color={theme.colors.textInverse} />
          <Text style={styles.applyText}>{hasApplied ? t('applied') : t('applyNow')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bookmarked')}
          onPress={() => toggleBookmark(job.id)}
          style={styles.iconAction}
        >
          <MaterialCommunityIcons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={25}
            color={isBookmarked ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={handleShare} style={styles.iconAction}>
          <MaterialCommunityIcons name="share-variant-outline" size={23} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
};

const Stat: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }> = ({ icon, text }) => (
  <View style={styles.statItem}>
    <MaterialCommunityIcons name={icon} size={16} color={theme.colors.secondary} />
    <Text style={styles.statText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  pressed: {
    opacity: 0.88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  ratingText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '800',
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentLight,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 7,
    gap: 4,
    marginTop: theme.spacing.md,
  },
  payText: {
    ...theme.typography.bodyBold,
    color: theme.colors.accentDark,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.lg,
    columnGap: theme.spacing.md,
    rowGap: theme.spacing.xs,
  },
  statItem: {
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  applyBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  applyBtnDone: {
    backgroundColor: theme.colors.success,
  },
  applyText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  iconAction: {
    width: 54,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
});
