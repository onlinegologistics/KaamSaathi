import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { JobForm } from '../../components/JobForm';
import { useApp } from '../../context/AppContext';
import { getJob, updateJob, BackendJob, CreateJobPayload } from '../../services/api';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditJob'>;

export const EditJobScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { t, accessToken } = useApp();
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getJob(accessToken, jobId)
      .then((res) => setJob(res.job))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [accessToken, jobId]);

  const handleSubmit = async (payload: CreateJobPayload) => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await updateJob(accessToken, jobId, payload);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Edit Job</Text>
      </View>

      {loading || !job ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <JobForm initialJob={job} submitLabel="Save Changes" submitting={saving} onSubmit={handleSubmit} />
        </ScrollView>
      )}
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
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
});
