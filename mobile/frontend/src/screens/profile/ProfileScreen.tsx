import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { listJobs } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken, currentUser, logout, bookmarkedJobIds, appliedJobIds } = useApp();
  const [postedCount, setPostedCount] = useState(0);

  const savedCount = bookmarkedJobIds.length;
  const appliedCount = appliedJobIds.length;

  useEffect(() => {
    if (!accessToken) return;
    listJobs(accessToken, { mine: true, limit: 1 })
      .then((res) => setPostedCount(res.pagination.total))
      .catch(() => {});
  }, [accessToken]);

  const confirmLogout = () => {
    Alert.alert(t('logout'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('myProfile')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings')}
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar uri={currentUser?.avatar} name={currentUser?.name ?? 'User'} size={92} verified={currentUser?.verified} />
          <Text style={styles.name}>{currentUser?.name ?? 'User'}</Text>
          <Text style={styles.phone}>{currentUser?.phone}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('editProfile')}
            onPress={() => navigation.navigate('EditProfile')}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="pencil-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.editText}>{t('editProfile')}</Text>
          </Pressable>
        </View>

        <MenuCard
          icon="briefcase-outline"
          tint={theme.colors.primary}
          title="My Jobs"
          subtitle={`${postedCount} posted • ${appliedCount} applied`}
          onPress={() => navigation.navigate('JobApplicants')}
        />
        <MenuCard
          icon="send-outline"
          tint={theme.colors.secondary}
          title={t('myApplications')}
          subtitle={`${appliedCount} jobs you applied to`}
          onPress={() => navigation.navigate('MyApplications')}
        />
        <MenuCard
          icon="bookmark-outline"
          tint={theme.colors.accentDark}
          title={t('savedJobs')}
          subtitle={`${savedCount} jobs you bookmarked`}
          onPress={() => navigation.navigate('SavedJobs')}
        />
        <MenuCard
          icon="help-circle-outline"
          tint={theme.colors.categoryElectrician}
          title={t('help')}
          subtitle="Get help and contact support"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <MenuCard
          icon="logout"
          tint={theme.colors.danger}
          title={t('logout')}
          subtitle="Sign out of this device"
          destructive
          onPress={confirmLogout}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const MenuCard: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  destructive?: boolean;
  onPress: () => void;
}> = ({ icon, tint, title, subtitle, destructive, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
  >
    <View style={[styles.cardIcon, { backgroundColor: `${tint}1A` }]}>
      <MaterialCommunityIcons name={icon} size={23} color={tint} />
    </View>
    <View style={styles.cardCopy}>
      <Text style={[styles.cardTitle, destructive && styles.cardTitleDestructive]}>{title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 96,
  },
  identity: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  phone: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  editText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  cardTitleDestructive: {
    color: theme.colors.danger,
  },
  cardSubtitle: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
