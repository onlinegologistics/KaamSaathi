import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { ProfileForm, ProfileFormHandle, ProfileFormValues } from '../../components/ProfileForm';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, updateProfile } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<ProfileFormHandle>(null);

  const handleSubmit = async (values: ProfileFormValues) => {
    setSubmitting(true);
    try {
      await updateProfile(values);
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save Changes"
          disabled={submitting}
          onPress={() => formRef.current?.submit()}
          style={({ pressed }) => [styles.saveAction, pressed && styles.pressed, submitting && styles.disabled]}
        >
          <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ProfileForm
          ref={formRef}
          initialUser={currentUser}
          submitLabel="Save Changes"
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </ScrollView>
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
    ...theme.typography.h2,
    color: theme.colors.text,
    flex: 1,
  },
  saveAction: {
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  saveText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 118,
  },
});
