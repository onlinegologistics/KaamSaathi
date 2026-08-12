import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { listJobs } from '../../services/api';
import { useApp } from '../../context/AppContext';
import type { ProfileEditSection, ProfileStackParamList } from '../../navigation/types';
import { getProfileCompletionPercent, getProfileCompletionTasks } from '../../utils/profileCompletion';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

// KYC (and, transitively, Wallet once KYC is verified) doesn't need every last profile
// field filled in first — 75% is enough to start, so users aren't blocked by something
// minor like a missing avatar or language tag.
const KYC_UNLOCK_PROFILE_PERCENT = 75;

const reviewBadgeFor = (status?: string) => {
  if (status === 'verified') return { text: 'Approved', color: theme.colors.success };
  if (status === 'submitted') return { text: 'Under review - 24h', color: theme.colors.warning };
  if (status === 'rejected') return { text: 'Rejected', color: theme.colors.danger };
  return { text: 'Pending', color: theme.colors.primary };
};

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken, currentUser, logout, bookmarkedJobIds, appliedJobIds, refreshProfile } = useApp();
  const [postedCount, setPostedCount] = useState(0);

  // KYC/wallet approvals happen server-side (an admin, outside this app session) — refetch
  // whenever this screen regains focus so status/percent never sits stale.
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const savedCount = bookmarkedJobIds.length;
  const appliedCount = appliedJobIds.length;
  const setupTasks = useMemo(() => getProfileCompletionTasks(currentUser), [currentUser]);
  const profileComplete = setupTasks.find((task) => task.key === 'profile')?.complete ?? false;
  const kycComplete = setupTasks.find((task) => task.key === 'kyc')?.complete ?? false;
  const walletComplete = setupTasks.find((task) => task.key === 'wallet')?.complete ?? false;
  const profilePercent = useMemo(() => getProfileCompletionPercent(currentUser), [currentUser]);
  const canStartKyc = profileComplete || profilePercent >= KYC_UNLOCK_PROFILE_PERCENT;
  const kycBadge = reviewBadgeFor(currentUser?.kyc?.status);
  const walletBadge = reviewBadgeFor(currentUser?.wallet?.status);
  const accountTypeLabel = currentUser?.accountType
    ? currentUser.accountType.charAt(0).toUpperCase() + currentUser.accountType.slice(1)
    : 'Worker';
  const accountTypePending = currentUser?.accountTypeChange?.status === 'pending';

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

  const openSetupSection = (section: ProfileEditSection) => {
    if (section === 'kyc' && !canStartKyc) {
      Alert.alert(
        'Complete Profile First',
        `Profile ${KYC_UNLOCK_PROFILE_PERCENT}% complete karne ke baad KYC start hoga. Abhi ${profilePercent}% hai.`
      );
      return;
    }
    if (section === 'wallet' && !kycComplete) {
      Alert.alert('Complete KYC First', 'Wallet setup se pehle KYC complete karna hoga.');
      return;
    }
    if (section === 'wallet' && walletComplete) {
      navigation.navigate('Wallet');
      return;
    }
    navigation.navigate('EditProfile', { section });
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('editProfile')}
            onPress={() => navigation.navigate('EditProfile', { section: 'profile' })}
            style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
          >
            <Avatar uri={currentUser?.avatar} name={currentUser?.name ?? 'User'} size={92} verified={currentUser?.verified} />
            <View style={styles.avatarEditBadge}>
              <MaterialCommunityIcons name="camera" size={16} color={theme.colors.textInverse} />
            </View>
          </Pressable>
          <Text style={styles.name}>{currentUser?.name ?? 'User'}</Text>
          <Text style={styles.phone}>{currentUser?.phone}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('editProfile')}
            onPress={() => navigation.navigate('EditProfile', { section: 'profile' })}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="pencil-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.editText}>{t('editProfile')}</Text>
          </Pressable>
        </View>

        <View style={styles.menuList}>
          {/* Day-to-day actions first — these are what people actually open Profile for most
              often. Setup/admin items (Wallet, KYC, Account Type) follow since they're mostly
              one-time or rare, and Help/Logout close it out. */}
          <SetupStepCard
            icon="account-check-outline"
            tint={theme.colors.primary}
            title="Profile"
            subtitle="Personal and work details"
            complete={profileComplete}
            statusText={profileComplete ? undefined : `${profilePercent}%`}
            onPress={() => openSetupSection('profile')}
          />
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
          {currentUser?.accountType === 'both' && (
            <MenuCard
              icon="chat-processing-outline"
              tint={theme.colors.secondary}
              title="Messages"
              subtitle="Chats with employers and workers"
              onPress={() => navigation.navigate('ChatList')}
            />
          )}
          <SetupStepCard
            icon="wallet-outline"
            tint={theme.colors.accentDark}
            title={walletComplete ? 'Wallet' : 'Wallet Setup'}
            subtitle="Required for money withdrawal"
            complete={walletComplete}
            statusText={walletBadge.text}
            statusColor={walletBadge.color}
            locked={!kycComplete}
            onPress={() => openSetupSection('wallet')}
          />
          <SetupStepCard
            icon="shield-check-outline"
            tint={theme.colors.secondary}
            title="KYC"
            subtitle="Required for job apply and post"
            complete={kycComplete}
            statusText={kycBadge.text}
            statusColor={kycBadge.color}
            locked={!canStartKyc}
            onPress={() => openSetupSection('kyc')}
          />
          <MenuCard
            icon="account-convert-outline"
            tint={theme.colors.secondary}
            title="Account Type"
            subtitle={
              accountTypePending
                ? 'Change request pending admin approval'
                : `${accountTypeLabel} · tap to request a change`
            }
            onPress={() => navigation.navigate('AccountType')}
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
        </View>
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

const SetupStepCard: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  complete: boolean;
  statusText?: string;
  statusColor?: string;
  locked?: boolean;
  onPress: () => void;
}> = ({ icon, tint, title, subtitle, complete, statusText, statusColor, locked, onPress }) => {
  const showStatus = locked || !complete;
  const status = locked ? 'Locked' : statusText ?? 'Pending';
  const resolvedStatusColor = locked ? theme.colors.textMuted : statusColor ?? theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.setupCard, pressed && styles.pressed, locked && styles.setupCardLocked]}
    >
      <View style={[styles.setupIcon, { backgroundColor: `${tint}1A` }]}>
        <MaterialCommunityIcons
          name={locked ? 'lock-outline' : complete ? 'check' : icon}
          size={22}
          color={locked ? theme.colors.textMuted : complete ? theme.colors.success : tint}
        />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {showStatus && (
        <View style={[styles.statusPill, { borderColor: `${resolvedStatusColor}55` }]}>
          <Text style={[styles.statusText, { color: resolvedStatusColor }]}>{status}</Text>
        </View>
      )}
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );
};

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
  avatarWrap: {
    width: 92,
    height: 92,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
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
  menuList: {
    marginBottom: theme.spacing.md,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  setupCardLocked: {
    opacity: 0.72,
  },
  setupIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    minHeight: 26,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  statusText: {
    ...theme.typography.tiny,
    fontWeight: '800',
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
