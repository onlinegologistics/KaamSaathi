import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { JobCard } from '../../components/JobCard';
import { Avatar } from '../../components/Avatar';
import { listJobs, getJobChat, BackendJob } from '../../services/api';
import { toJobViewModel } from '../../utils/jobAdapter';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyApplications'>;

export const MyApplicationsScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, currentUser, applyToJob, cancelAcceptedJob } = useApp();
  const [jobs, setJobs] = useState<BackendJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  const fetchApplications = useCallback(() => {
    if (!accessToken) return;
    listJobs(accessToken, { applied: true, limit: 50 })
      .then((res) => setJobs(res.data))
      .catch(() => setJobs([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  const openAcceptedChat = async (job: BackendJob) => {
    if (!accessToken) return;
    const res = await getJobChat(accessToken, job._id);
    if (!res.chat) return;
    navigation.getParent()?.navigate('ChatTab', {
      screen: 'ChatThread',
      params: {
        chatId: res.chat._id,
        jobId: job._id,
        jobTitle: job.title,
        otherUserId: job.postedBy._id,
        otherUserName: job.postedBy.name || 'User',
        otherUserAvatar: job.postedBy.photoUrl,
      },
    } as never);
  };

  const confirmCancelAccepted = (job: BackendJob) => {
    Alert.alert(
      'Cancel work?',
      'This will remove you from the accepted job and make the job open again for other workers.',
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Cancel Work',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || cancellingJobId) return;
            setCancellingJobId(job._id);
            try {
              await cancelAcceptedJob(job._id);
              fetchApplications();
            } catch (e) {
              Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again.');
            } finally {
              setCancellingJobId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>My Applications</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
          renderItem={({ item }) => {
            const myApplication = item.applicants.find((a) => a.userId._id === currentUser?.id);
            if (myApplication?.status === 'accepted') {
              return (
                <AcceptedApplicationCard
                  job={item}
                  onOpenJob={() =>
                    navigation.getParent()?.navigate('HomeTab', { screen: 'JobDetail', params: { jobId: item._id } } as never)
                  }
                  onMessage={() => openAcceptedChat(item)}
                  onCancel={() => confirmCancelAccepted(item)}
                  cancelling={cancellingJobId === item._id}
                />
              );
            }
            if (myApplication?.status === 'cancelled') {
              return (
                <CancelledApplicationCard
                  job={item}
                  onOpenJob={() =>
                    navigation.getParent()?.navigate('HomeTab', { screen: 'JobDetail', params: { jobId: item._id } } as never)
                  }
                />
              );
            }

            return (
              <JobCard
                job={toJobViewModel(item)}
                onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'JobDetail', params: { jobId: item._id } } as never)}
                onApply={() => applyToJob(item._id)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="send-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>
                {currentUser ? "You haven't applied to any jobs yet." : 'Sign in to see your applications.'}
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const AcceptedApplicationCard: React.FC<{
  job: BackendJob;
  onOpenJob: () => void;
  onMessage: () => void;
  onCancel: () => void;
  cancelling: boolean;
}> = ({ job, onOpenJob, onMessage, onCancel, cancelling }) => (
  <View style={styles.acceptedCard}>
    <View style={styles.acceptedTop}>
      <Avatar
        uri={job.postedBy.photoUrl}
        name={job.postedBy.name || 'User'}
        size={52}
        verified={job.postedBy.aadhaarVerification?.isVerified}
      />
      <View style={styles.acceptedBody}>
        <Text style={styles.acceptedName} numberOfLines={1}>
          {job.postedBy.name || 'User'}
        </Text>
        <Text style={styles.acceptedMeta} numberOfLines={1}>
          {job.title}
        </Text>
      </View>
      <View style={styles.acceptedBadge}>
        <Text style={styles.acceptedBadgeText}>Accepted</Text>
      </View>
    </View>
    <Text style={styles.acceptedHint}>
      Your application is accepted. Show OTP {job.workerOtp?.code ? job.workerOtp.code : 'from job details'} at the work location.
    </Text>
    <View style={styles.acceptedActions}>
      <Pressable accessibilityRole="button" style={styles.secondaryAction} onPress={onOpenJob}>
        <MaterialCommunityIcons name="shield-key-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.secondaryActionText}>View OTP</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.primaryAction} onPress={onMessage}>
        <MaterialCommunityIcons name="chat-processing-outline" size={18} color={theme.colors.textInverse} />
        <Text style={styles.primaryActionText}>Message</Text>
      </Pressable>
    </View>
    {!job.workerOtp?.verifiedAt ? (
      <Pressable
        accessibilityRole="button"
        disabled={cancelling}
        style={({ pressed }) => [styles.cancelAction, pressed && !cancelling && styles.pressed, cancelling && styles.disabled]}
        onPress={onCancel}
      >
        <MaterialCommunityIcons name="close-circle-outline" size={18} color={theme.colors.danger} />
        <Text style={styles.cancelActionText}>{cancelling ? 'Cancelling...' : 'Cancel Work'}</Text>
      </Pressable>
    ) : null}
  </View>
);

const CancelledApplicationCard: React.FC<{ job: BackendJob; onOpenJob: () => void }> = ({ job, onOpenJob }) => (
  <Pressable accessibilityRole="button" onPress={onOpenJob} style={({ pressed }) => [styles.cancelledCard, pressed && styles.pressed]}>
    <View style={styles.cancelledIcon}>
      <MaterialCommunityIcons name="close-circle-outline" size={24} color={theme.colors.danger} />
    </View>
    <View style={styles.cancelledBody}>
      <Text style={styles.acceptedName} numberOfLines={1}>
        {job.title}
      </Text>
      <Text style={styles.acceptedMeta} numberOfLines={1}>
        Cancelled by you. This job is open again for other workers.
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
  </Pressable>
);

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  listContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
  },
  acceptedCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  cancelledCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cancelledIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledBody: {
    flex: 1,
  },
  acceptedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  acceptedBody: {
    flex: 1,
  },
  acceptedName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  acceptedMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  acceptedBadge: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  acceptedBadgeText: {
    ...theme.typography.tiny,
    color: theme.colors.success,
    fontWeight: '800',
  },
  acceptedHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  acceptedActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
  cancelAction: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.dangerLight,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  cancelActionText: {
    ...theme.typography.button,
    color: theme.colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
});
