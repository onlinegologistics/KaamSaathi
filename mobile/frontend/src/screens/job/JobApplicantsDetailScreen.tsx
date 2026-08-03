import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import {
  getJob,
  acceptApplicant,
  rejectApplicant,
  getJobChat,
  deleteJob,
  verifyWorkerOtp,
  BackendJob,
  BackendJobApplicant,
} from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'JobApplicantsDetail'>;

export const JobApplicantsDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { accessToken } = useApp();
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [otpDraft, setOtpDraft] = useState('');

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

  const handleAccept = async (applicant: BackendJobApplicant) => {
    if (!accessToken) return;
    setActioningUserId(applicant.userId._id);
    try {
      await acceptApplicant(accessToken, jobId, applicant.userId._id);
      fetchJob();
    } catch (e) {
      Alert.alert('Could not accept', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setActioningUserId(null);
    }
  };

  const handleReject = async (applicant: BackendJobApplicant) => {
    if (!accessToken) return;
    setActioningUserId(applicant.userId._id);
    try {
      await rejectApplicant(accessToken, jobId, applicant.userId._id);
      fetchJob();
    } catch (e) {
      Alert.alert('Could not reject', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setActioningUserId(null);
    }
  };

  const handleMessage = async (applicant: BackendJobApplicant) => {
    if (!accessToken) return;
    try {
      const res = await getJobChat(accessToken, jobId, applicant.userId._id);
      if (!res.chat) {
        Alert.alert('Not available', 'Chat has not started yet.');
        return;
      }
      navigation.getParent()?.navigate('ChatTab', {
        screen: 'ChatThread',
        params: {
          chatId: res.chat._id,
          jobId,
          jobTitle: job?.title ?? '',
          otherUserId: applicant.userId._id,
          otherUserName: applicant.userId.name || 'User',
          otherUserAvatar: applicant.userId.photoUrl,
        },
      } as never);
    } catch (e) {
      Alert.alert('Could not open chat', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!accessToken || !job || otpDraft.length !== 6) return;
    setActioningUserId(job.acceptedApplicant?._id ?? 'otp');
    try {
      const res = await verifyWorkerOtp(accessToken, jobId, otpDraft);
      setJob(res.job);
      setOtpDraft('');
      Alert.alert('Worker verified', 'OTP matched. This is the accepted worker.');
    } catch (e) {
      Alert.alert('Could not verify OTP', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setActioningUserId(null);
    }
  };

  const handleDelete = () => {
    if (!job) return;
    Alert.alert('Delete job?', `"${job.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken) return;
          setDeleting(true);
          try {
            await deleteJob(accessToken, jobId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Could not delete job', e instanceof Error ? e.message : 'Try again.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || !job) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {job.title}
        </Text>
        <IconButton
          name="pencil-outline"
          accessibilityLabel="Edit job"
          onPress={() => navigation.navigate('EditJob', { jobId })}
        />
        {deleting ? (
          <ActivityIndicator size="small" color={theme.colors.danger} />
        ) : (
          <IconButton name="trash-can-outline" accessibilityLabel="Delete job" onPress={handleDelete} color={theme.colors.danger} />
        )}
      </View>

      <FlatList
        data={job.applicants}
        keyExtractor={(item) => item.userId._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ApplicantRow
            applicant={item}
            busy={actioningUserId === item.userId._id}
            onAccept={() => handleAccept(item)}
            onReject={() => handleReject(item)}
            onMessage={() => handleMessage(item)}
            otpDraft={otpDraft}
            onOtpChange={setOtpDraft}
            onVerifyOtp={handleVerifyOtp}
            canVerify={item.status === 'accepted' && item.userId._id === job.acceptedApplicant?._id}
            otpVerified={!!job.workerOtp?.verifiedAt}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialCommunityIcons name="account-search-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No applicants yet.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const ApplicantRow: React.FC<{
  applicant: BackendJobApplicant;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMessage: () => void;
  otpDraft: string;
  onOtpChange: (text: string) => void;
  onVerifyOtp: () => void;
  canVerify: boolean;
  otpVerified: boolean;
}> = ({
  applicant,
  busy,
  onAccept,
  onReject,
  onMessage,
  otpDraft,
  onOtpChange,
  onVerifyOtp,
  canVerify,
  otpVerified,
}) => (
  <View style={styles.row}>
    <Avatar uri={applicant.userId.photoUrl} name={applicant.userId.name || 'User'} size={48} />
    <View style={styles.rowBody}>
      <Text style={styles.rowName}>{applicant.userId.name || 'User'}</Text>
      <Text style={styles.rowMeta}>{applicant.userId.phone}</Text>
      {canVerify && (
        <View style={styles.otpBox}>
          <View style={styles.otpStatusRow}>
            <MaterialCommunityIcons
              name={otpVerified ? 'shield-check-outline' : 'shield-key-outline'}
              size={18}
              color={otpVerified ? theme.colors.success : theme.colors.primary}
            />
            <Text style={[styles.otpStatus, otpVerified && styles.otpStatusDone]}>
              {otpVerified ? 'Worker OTP verified' : 'Verify worker OTP'}
            </Text>
          </View>
          {!otpVerified && (
            <View style={styles.otpInputRow}>
              <TextInput
                value={otpDraft}
                onChangeText={(text) => onOtpChange(text.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter OTP"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
              />
              <Button
                label="Verify"
                onPress={onVerifyOtp}
                disabled={otpDraft.length !== 6 || busy}
                loading={busy}
                style={styles.verifyBtn}
              />
            </View>
          )}
        </View>
      )}
    </View>
    {applicant.status === 'applied' && (
      <View style={styles.actions}>
        <Button label="Accept" onPress={onAccept} loading={busy} style={styles.actionBtn} />
        <Button label="Reject" onPress={onReject} variant="outline" disabled={busy} style={styles.actionBtn} />
      </View>
    )}
    {applicant.status === 'accepted' && (
      <Button label="Message" onPress={onMessage} variant="outline" style={styles.actionBtn} />
    )}
    {applicant.status === 'rejected' && <Text style={styles.rejectedText}>Rejected</Text>}
  </View>
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
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  rowMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: theme.spacing.xs,
  },
  actionBtn: {
    minWidth: 90,
  },
  rejectedText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  otpBox: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  otpStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  otpStatus: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  otpStatusDone: {
    color: theme.colors.success,
  },
  otpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  otpInput: {
    minHeight: 44,
    minWidth: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
  },
  verifyBtn: {
    minWidth: 86,
  },
});
