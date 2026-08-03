import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { JobForm } from '../../components/JobForm';
import { useApp } from '../../context/AppContext';
import { createJob, CreateJobPayload } from '../../services/api';
import { PostStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PostStackParamList, 'PostJob'>;

export const PostJobScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken } = useApp();
  const [posting, setPosting] = useState(false);

  // The floating bottom tab bar is absolutely positioned and otherwise
  // overlaps this screen's footer button — hide it while this screen is
  // focused, same as the Search/Chat screens do.
  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const handleSubmit = async (payload: CreateJobPayload) => {
    if (!accessToken) return;
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
        <JobForm submitLabel={t('postJob')} submitting={posting} onSubmit={handleSubmit} />
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
});
