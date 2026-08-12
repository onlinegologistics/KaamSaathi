import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Share, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { ReportModal } from '../../components/ReportModal';
import { startJobCall } from '../../utils/call';
import { getCategoryMeta } from '../../data/categories';
import { getJob, getJobChat, BackendJob } from '../../services/api';
import { formatDurationHours } from '../../utils/jobAdapter';
import { timeAgo } from '../../utils/time';
import { useApp } from '../../context/AppContext';
import { HomeStackParamList, SearchStackParamList, MainTabParamList } from '../../navigation/types';

type JobDetailNavigation = CompositeNavigationProp<
  NativeStackScreenProps<HomeStackParamList | SearchStackParamList, 'JobDetail'>['navigation'],
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = Omit<NativeStackScreenProps<HomeStackParamList | SearchStackParamList, 'JobDetail'>, 'navigation'> & {
  navigation: JobDetailNavigation;
};

export const JobDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { t, accessToken, currentUser, toggleBookmark, bookmarkedJobIds, applyToJob, cancelAcceptedJob, categories } = useApp();
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [calling, setCalling] = useState(false);
  // The footer is absolutely positioned over the ScrollView, and its height varies (poster
  // vs accepted-worker vs applied, plus the optional Cancel Work row) — a fixed scrollTail
  // height would inevitably fall out of sync and hide content (e.g. the OTP code) behind it.
  const [footerHeight, setFooterHeight] = useState(96);

  // This screen has its own bottom action bar (Call/Message/Live Location, or Manage
  // Applicants) — the floating tab bar sitting on top of it too is what was causing the
  // Live Location button to look clipped/stuck behind the tab bar. Same pattern as
  // ChatThreadScreen/SearchScreen: hide the tab bar while this screen is focused.
  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const fetchJob = useCallback(() => {
    if (!accessToken) return;
    getJob(accessToken, jobId)
      .then((res) => setJob(res.job))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [accessToken, jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  if (loading || !job) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const category = getCategoryMeta(job.category, categories);
  const isBookmarked = bookmarkedJobIds.includes(job._id);
  const isPoster = currentUser?.id === job.postedBy._id;
  const myApplication = job.applicants.find((a) => a.userId._id === currentUser?.id);
  const isAcceptedApplicant = myApplication?.status === 'accepted';
  const payLabel = `₹${job.payAmount}`;
  // Employer-only accounts never apply to jobs, on any screen — matches the same rule
  // already enforced in JobCard/JobRow for list views. When none of the other footer states
  // apply (not the poster, no application) and this account can't apply either, there's
  // nothing actionable to show, so the whole footer bar is hidden rather than left empty.
  const cannotApply = currentUser?.accountType === 'employer';
  const showFooter = isPoster || !!myApplication || !cannotApply;

  const handleApply = async () => {
    if (applying || cannotApply) return;
    setApplying(true);
    try {
      await applyToJob(job._id);
      fetchJob();
    } catch (e) {
      Alert.alert('Could not apply', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setApplying(false);
    }
  };

  const openChat = async () => {
    if (!accessToken || openingChat) return;
    setOpeningChat(true);
    try {
      const res = await getJobChat(accessToken, job._id);
      if (!res.chat) {
        Alert.alert('Not available', 'Chat is not open yet for this job.');
        return;
      }
      const otherUser = isPoster ? job.applicants.find((a) => a.status === 'accepted')?.userId : job.postedBy;
      navigation.navigate('ChatThread', {
        chatId: res.chat._id,
        jobId: job._id,
        jobTitle: job.title,
        otherUserId: otherUser?._id ?? '',
        otherUserName: otherUser?.name || 'User',
        otherUserAvatar: otherUser?.photoUrl,
      });
    } catch (e) {
      Alert.alert('Could not open chat', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setOpeningChat(false);
    }
  };

  const handleCall = async () => {
    if (!accessToken || calling) return;
    setCalling(true);
    try {
      await startJobCall(accessToken, job._id);
    } finally {
      setCalling(false);
    }
  };

  const confirmCancelAccepted = () => {
    Alert.alert(
      'Cancel work?',
      'This will remove you from the accepted job and make the job open again for other workers.',
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Cancel Work',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || cancelling) return;
            setCancelling(true);
            try {
              await cancelAcceptedJob(job._id);
              fetchJob();
            } catch (e) {
              Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <ScreenContainer edges={['left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={[styles.hero, { paddingTop: insets.top + theme.spacing.xs }]}
        >
          <View style={styles.heroRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={() => navigation.goBack()}
              style={styles.heroIconBtn}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textInverse} />
            </Pressable>

            <View style={styles.heroActions}>
              {job.postedBy.aadhaarVerification?.isVerified ? (
                <View style={styles.heroIconBtn}>
                  <MaterialCommunityIcons name="shield-check-outline" size={22} color={theme.colors.textInverse} />
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share"
                onPress={() => Share.share({ message: `${job.title} - ${payLabel}` }).catch(() => {})}
                style={styles.heroIconBtn}
              >
                <MaterialCommunityIcons name="share-variant-outline" size={22} color={theme.colors.textInverse} />
              </Pressable>

              {!isPoster ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('bookmarked')}
                    onPress={() => toggleBookmark(job._id)}
                    style={styles.heroIconBtn}
                  >
                    <MaterialCommunityIcons
                      name={isBookmarked ? 'heart' : 'heart-outline'}
                      size={22}
                      color={theme.colors.textInverse}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('reportJob')}
                    onPress={() => setReportVisible(true)}
                    style={styles.heroIconBtn}
                  >
                    <MaterialCommunityIcons name="flag-outline" size={22} color={theme.colors.textInverse} />
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
            <MaterialCommunityIcons
              name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={theme.colors.textInverse}
            />
          </View>

          <Text style={styles.title}>{job.title}</Text>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.primary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {`${job.location.address} • ${timeAgo(job.createdAt)}`}
            </Text>
          </View>

          <Text style={styles.pay}>{payLabel}</Text>
          <Text style={styles.payCaption}>Total Pay</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.description}>{job.description}</Text>

          <View style={styles.detailRows}>
            <DetailRow icon="briefcase-outline" label="Type" value={category.label} />
            <DetailRow icon="timer-outline" label={t('duration')} value={formatDurationHours(job.duration)} />
            <DetailRow icon="account-group-outline" label={t('peopleNeededLabel')} value={`${job.peopleNeeded}`} />
            <DetailRow icon="map-marker-outline" label={t('location')} value={job.location.address} />
            <DetailRow icon="calendar-clock" label="Scheduled For" value={new Date(job.scheduledFor).toLocaleString()} />
            <DetailRow
              icon="clock-check-outline"
              label={t('expectedCompletionLabel')}
              value={new Date(
                job.endAt ?? new Date(job.scheduledFor).getTime() + job.duration * 60 * 60 * 1000
              ).toLocaleString()}
            />
            <DetailRow icon="account-outline" label="Posted By" value={job.postedBy.name || 'User'} />
          </View>

          {isAcceptedApplicant ? (
            <View style={styles.otpPanel}>
              <View style={styles.otpHeader}>
                <MaterialCommunityIcons
                  name={job.workerOtp?.verifiedAt ? 'shield-check-outline' : 'shield-key-outline'}
                  size={22}
                  color={job.workerOtp?.verifiedAt ? theme.colors.success : theme.colors.primary}
                />
                <View style={styles.otpTextWrap}>
                  <Text style={styles.otpTitle}>
                    {job.workerOtp?.verifiedAt ? 'Worker verified' : 'Show this OTP to the poster'}
                  </Text>
                  <Text style={styles.otpHint}>
                    {job.workerOtp?.verifiedAt
                      ? 'Your arrival has been verified for this job.'
                      : 'Use it at the work location so the poster can confirm it is you.'}
                  </Text>
                </View>
              </View>
              {!job.workerOtp?.verifiedAt && job.workerOtp?.code ? <Text style={styles.otpCode}>{job.workerOtp.code}</Text> : null}
            </View>
          ) : null}

          {isPoster ? (
            <Text style={styles.posterHint}>Manage applicants for this job from Profile → My Job Posts.</Text>
          ) : null}
        </View>

        <View style={{ height: showFooter ? footerHeight : 0 }} />
      </ScrollView>

      {showFooter && (
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        {isPoster ? (
          <Button
            label="Manage Applicants"
            onPress={() => navigation.navigate('ProfileTab', { screen: 'JobApplicantsDetail', params: { jobId: job._id } })}
            fullWidth
            icon={<MaterialCommunityIcons name="account-group-outline" size={20} color={theme.colors.textInverse} />}
          />
        ) : myApplication?.status === 'accepted' ? (
          <View style={styles.acceptedFooterActions}>
            <View style={styles.callChatRow}>
              <Button
                label="Call"
                onPress={handleCall}
                loading={calling}
                style={styles.callChatBtn}
                variant="outline"
                icon={<MaterialCommunityIcons name="phone-outline" size={20} color={theme.colors.primary} />}
              />
              <Button
                label="Message"
                onPress={openChat}
                loading={openingChat}
                style={styles.callChatBtn}
                icon={<MaterialCommunityIcons name="chat-processing-outline" size={20} color={theme.colors.textInverse} />}
              />
            </View>
            <Button
              label="Live Location"
              onPress={() =>
                navigation.navigate('LiveLocation', { jobId: job._id, otherUserName: job.postedBy.name || 'User' })
              }
              variant="outline"
              fullWidth
              icon={<MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={theme.colors.primary} />}
            />
            {!job.workerOtp?.verifiedAt ? (
              <Button
                label="Cancel Work"
                onPress={confirmCancelAccepted}
                loading={cancelling}
                variant="outline"
                fullWidth
                icon={<MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.primary} />}
              />
            ) : null}
          </View>
        ) : myApplication?.status === 'applied' ? (
          <Button label={t('waitingToBeAccepted')} onPress={() => {}} disabled fullWidth />
        ) : myApplication?.status === 'rejected' ? (
          <Button label="Not Selected" onPress={() => {}} disabled fullWidth />
        ) : myApplication?.status === 'cancelled' ? (
          <Button label="Cancelled" onPress={() => {}} disabled fullWidth />
        ) : (
          <Button
            label={t('applyNow')}
            onPress={handleApply}
            loading={applying}
            disabled={job.status !== 'open'}
            fullWidth
          />
        )}
      </View>
      )}
      </ScreenContainer>
      <ReportModal visible={reportVisible} targetType="job" targetId={job._id} onClose={() => setReportVisible(false)} />
    </>
  );
};

const DetailRow: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon} size={19} color={theme.colors.primary} />
    <Text style={styles.detailLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    minHeight: 400,
  },
  categoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
  pay: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  payCaption: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  detailRows: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
  otpPanel: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  otpTextWrap: {
    flex: 1,
  },
  otpTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  otpHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  otpCode: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  posterHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  acceptedFooterActions: {
    gap: theme.spacing.sm,
  },
  callChatRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  callChatBtn: {
    flex: 1,
  },
});
