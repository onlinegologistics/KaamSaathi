import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listJobs, deleteJob, BackendJob } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'JobApplicants'>;

type JobsTab = 'posted' | 'applied' | 'completed';

const TABS: { key: JobsTab; label: string }[] = [
  { key: 'posted', label: 'Posted' },
  { key: 'applied', label: 'Applied' },
  { key: 'completed', label: 'Completed' },
];

const postedOn = (iso: string) =>
  `Posted on ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

const statusMeta = (status: BackendJob['status']) => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', color: theme.colors.textSecondary, bg: theme.colors.surfaceAlt };
    case 'in-progress':
      return { label: 'In Progress', color: theme.colors.accentDark, bg: theme.colors.accentLight };
    case 'cancelled':
      return { label: 'Cancelled', color: theme.colors.danger, bg: theme.colors.dangerLight };
    default:
      return { label: 'Active', color: theme.colors.success, bg: theme.colors.successLight };
  }
};

export const JobApplicantsScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [tab, setTab] = useState<JobsTab>('posted');
  const [myJobs, setMyJobs] = useState<BackendJob[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<BackendJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      listJobs(accessToken, { mine: true, limit: 50 })
        .then((res) => setMyJobs(res.data))
        .catch(() => setMyJobs([])),
      listJobs(accessToken, { applied: true, limit: 50 })
        .then((res) => setAppliedJobs(res.data))
        .catch(() => setAppliedJobs([])),
    ]).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const visible = useMemo(() => {
    if (tab === 'applied') return appliedJobs;
    if (tab === 'completed') return myJobs.filter((job) => job.status === 'completed');
    return myJobs.filter((job) => job.status !== 'completed');
  }, [tab, myJobs, appliedJobs]);

  const handleDelete = (job: BackendJob) => {
    Alert.alert('Delete job?', `"${job.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken) return;
          setDeletingId(job._id);
          try {
            await deleteJob(accessToken, job._id);
            setMyJobs((prev) => prev.filter((j) => j._id !== job._id));
          } catch (e) {
            Alert.alert('Could not delete job', e instanceof Error ? e.message : 'Try again.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const emptyCopy =
    tab === 'applied'
      ? "You haven't applied to any jobs yet."
      : tab === 'completed'
        ? 'No completed jobs yet.'
        : "You haven't posted any jobs yet.";

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => setTab(item.key)}
              style={styles.tabButton}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
          renderItem={({ item }) => (
            <JobPostCard
              job={item}
              // The Applied tab is an overview; full applicant actions (chat,
              // cancel) live on the dedicated My Applications screen.
              owned={tab !== 'applied'}
              deleting={deletingId === item._id}
              onPress={() =>
                tab === 'applied'
                  ? navigation.navigate('MyApplications')
                  : navigation.navigate('JobApplicantsDetail', { jobId: item._id })
              }
              onEdit={() => navigation.navigate('EditJob', { jobId: item._id })}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="briefcase-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>{emptyCopy}</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const JobPostCard: React.FC<{
  job: BackendJob;
  owned: boolean;
  deleting: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ job, owned, deleting, onPress, onEdit, onDelete }) => {
  const status = statusMeta(job.status);
  const applicants = job.applicants.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={job.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {job.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>{postedOn(job.createdAt)}</Text>
      <Text style={styles.cardMeta}>
        {owned
          ? `${applicants} Applicant${applicants === 1 ? '' : 's'}`
          : `₹${job.payAmount} • ${job.location.address}`}
      </Text>

      {owned ? (
        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit job"
            onPress={onEdit}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="pencil-outline" size={17} color={theme.colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>

          {deleting ? (
            <ActivityIndicator size="small" color={theme.colors.danger} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete job"
              onPress={onDelete}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={17} color={theme.colors.danger} />
              <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.xs,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabUnderline: {
    height: 2.5,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
  },
  tabUnderlineActive: {
    backgroundColor: theme.colors.primary,
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  statusText: {
    ...theme.typography.tiny,
    fontWeight: '800',
  },
  cardMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionTextDanger: {
    color: theme.colors.danger,
  },
  pressed: {
    opacity: 0.75,
  },
});
