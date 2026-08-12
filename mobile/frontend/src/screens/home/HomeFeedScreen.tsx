import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { JobCard } from '../../components/JobCard';
import { AnnouncementModal } from '../../components/AnnouncementModal';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { WelcomeModal } from '../../components/WelcomeModal';
import { listJobs } from '../../services/api';
import { toJobViewModel } from '../../utils/jobAdapter';
import { getProfileCompletionTasks } from '../../utils/profileCompletion';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { HomeStackParamList, MainTabParamList } from '../../navigation/types';

type HomeFeedNavigation = CompositeNavigationProp<
  NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>['navigation'],
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = {
  navigation: HomeFeedNavigation;
};

const PAGE_SIZE = 10;

// The greeting row, location and search bar sit outside the list so the whole
// header stays put while the feed scrolls underneath it.

// Banner art framing, tuned to the bundled hero (1823x863, worker on the right).
// All fixed pixels on purpose: a percentage height plus aspectRatio makes the
// image's width depend on a height that depends on the image, and the card
// grows without bound.
// "Nigdi, Pimpri-Chinchwad" — locality first, then the wider city. Fields are
// inconsistently populated per device, so each slot falls back a level.
const formatPlace = (place: Location.LocationGeocodedAddress): string => {
  const locality = place.district || place.name || place.street;
  const city = place.city || place.subregion || place.region;
  const parts = [locality, city].filter((p): p is string => !!p && p.trim().length > 0);
  return Array.from(new Set(parts)).join(', ');
};

const BANNER_HEIGHT = 172;
const HERO_SLOT_WIDTH = 128;
const HERO_IMAGE_WIDTH = Math.round(BANNER_HEIGHT * (1823 / 863)); // 363
const HERO_FOCUS_OFFSET = 178;

export const HomeFeedScreen: React.FC<Props> = ({ navigation }) => {
  const {
    t,
    accessToken,
    currentUser,
    applyToJob,
    updateProfile,
    remoteSettings,
    shouldShowAnnouncement,
    dismissAnnouncement,
    welcome,
    dismissWelcome,
    logout,
    categories,
    categoryGroups,
    unreadNotificationCount,
  } = useApp();
  const accountType = currentUser?.accountType ?? 'worker';
  const canPost = accountType !== 'worker';
  const canApply = accountType !== 'employer';
  const [categoryGroup, setCategoryGroup] = useState<string | 'all'>('all');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [popularJobs, setPopularJobs] = useState<Job[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);
  const manualPickRef = useRef(false);

  // Ask on open, then turn the fix into a readable place name for the header.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;

        const pos = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coords);

        const [place] = await Location.reverseGeocodeAsync(coords);
        // A location the user picked by hand outranks whatever GPS resolves to.
        if (cancelled || !place || manualPickRef.current) return;
        const label = formatPlace(place);
        if (label) setDetectedLabel(label);
      } catch {
        // Location is a nicety here — the feed still works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchJobs = useCallback(
    async (targetPage: number) => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await listJobs(accessToken, {
          categoryGroup: categoryGroup !== 'all' ? categoryGroup : undefined,
          status: 'open',
          page: targetPage,
          limit: PAGE_SIZE,
        });
        const mapped = res.data.map((job) => toJobViewModel(job, userLocation));
        setJobs((prev) => (targetPage === 1 ? mapped : [...prev, ...mapped]));
        setHasMore(targetPage < res.pagination.pages);
        setPage(targetPage);
      } catch {
        // best-effort — keep whatever was already loaded
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, categoryGroup, userLocation]
  );

  useEffect(() => {
    fetchJobs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, categoryGroup, userLocation]);

  // Independent of the category filter above — this is what "Popular Services"
  // ranks by, so switching a filter on the main feed can't collapse it to one category.
  const fetchPopularJobs = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await listJobs(accessToken, { status: 'open', page: 1, limit: 50 });
      setPopularJobs(res.data.map((job) => toJobViewModel(job, userLocation)));
    } catch {
      // best-effort — Popular Services just keeps showing the last good data
    }
  }, [accessToken, userLocation]);

  useEffect(() => {
    fetchPopularJobs();
  }, [fetchPopularJobs]);

  // Ranks each category by how many open jobs it has right now, so this
  // reflects real demand instead of repeating whatever the main feed shows.
  const popularServices = useMemo(() => {
    const stats = new Map<string, { count: number; minPay: number }>();
    popularJobs.forEach((job) => {
      const existing = stats.get(job.category);
      if (existing) {
        existing.count += 1;
        existing.minPay = Math.min(existing.minPay, job.pay);
      } else {
        stats.set(job.category, { count: 1, minPay: job.pay });
      }
    });
    const grouped = categories.reduce<Record<string, { key: string; name: string; count: number; minPay: number; color: string; icon: string }>>(
        (acc, cat) => {
          if (!cat.groupKey || !cat.groupName) return acc;
          const stat = stats.get(cat.key);
          if (!stat) return acc;
          const existing = acc[cat.groupKey];
          if (existing) {
            existing.count += stat.count;
            existing.minPay = Math.min(existing.minPay, stat.minPay);
          } else {
            acc[cat.groupKey] = {
              key: cat.groupKey,
              name: cat.groupName,
              count: stat.count,
              minPay: stat.minPay,
              color: cat.color,
              icon: cat.icon,
            };
          }
          return acc;
        },
        {}
      );
    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [categories, popularJobs]);

  const profileTasks = useMemo(() => getProfileCompletionTasks(currentUser), [currentUser]);
  const incompleteProfileTasks = profileTasks.filter((task) => !task.complete);
  const openProfileSetup = useCallback(() => {
    navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
  }, [navigation]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) fetchJobs(page + 1);
  }, [hasMore, loading, page, fetchJobs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs(1);
    fetchPopularJobs();
  }, [fetchJobs, fetchPopularJobs]);

  const renderItem = useCallback(
    ({ item }: { item: Job }) => (
      <JobCard
        job={item}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        onApply={() => applyToJob(item.id)}
      />
    ),
    [navigation, applyToJob]
  );

  // Saving from here sends the rest of the profile back untouched so a location
  // change can't blank out fields the user set elsewhere.
  const handleLocationSave = useCallback(
    async (location: { latitude: number; longitude: number; label: string }) => {
      setLocationPickerVisible(false);
      manualPickRef.current = true;
      setDetectedLabel(location.label);
      if (!currentUser) return;
      try {
        await updateProfile({
          name: currentUser.name,
          avatar: currentUser.avatar,
          email: currentUser.email,
          dateOfBirth: currentUser.dateOfBirth,
          education: currentUser.education,
          currentAddress: currentUser.currentAddress,
          location,
        });
      } catch {
        // Non-blocking — the feed keeps working with the previous location.
      }
    },
    [currentUser, updateProfile]
  );

  const heroImageSource = remoteSettings['mobile.home.heroImageUrl']
    ? { uri: remoteSettings['mobile.home.heroImageUrl'] }
    : require('../../../assets/home-hero-worker.png');

  // GPS wins on open; a hand-picked location replaces it for the session.
  const locationLabel = detectedLabel ?? currentUser?.location?.label;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.stickyHeader}>
        <View style={styles.greetingRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menu"
            onPress={() => setMenuVisible(true)}
            style={styles.menuBtn}
          >
            <MaterialCommunityIcons name="menu" size={24} color={theme.colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change location"
            onPress={() => setLocationPickerVisible(true)}
            style={({ pressed }) => [styles.greetingCopy, pressed && styles.pressed]}
          >
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={15} color={theme.colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel || 'Set your location'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={17} color={theme.colors.textMuted} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerIconBtn}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.text} />
            {unreadNotificationCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search')}
          onPress={() =>
            canApply ? navigation.navigate('Search') : navigation.navigate('ExploreTab', { screen: 'ExploreMain' })
          }
          style={styles.searchBar}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.primary} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            {canApply ? 'Search jobs, skills or people...' : 'Explore what you can do on AnyWork...'}
          </Text>
          <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[theme.colors.bannerStart, theme.colors.bannerEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerTitle}>Find Trusted</Text>
                <Text style={styles.bannerTitleStrong}>Professionals</Text>
                <Text style={styles.bannerTitle}>For Any Work</Text>

                {canPost ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('postJob')}
                    onPress={() => navigation.navigate('PostTab', { screen: 'PostJob' })}
                    style={({ pressed }) => [styles.bannerCta, pressed && styles.pressed]}
                  >
                    <Text style={styles.bannerCtaText}>Post a Job</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.textInverse} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('search')}
                    onPress={() => navigation.navigate('Search')}
                    style={({ pressed }) => [styles.bannerCta, pressed && styles.pressed]}
                  >
                    <Text style={styles.bannerCtaText}>Find Work</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.textInverse} />
                  </Pressable>
                )}
              </View>

              <View style={styles.bannerImageWrap}>
                <Image source={heroImageSource} style={styles.bannerImage} />
              </View>
            </LinearGradient>

            {incompleteProfileTasks.length > 0 ? (
              <ProfileIncompleteNotice tasks={incompleteProfileTasks} onPress={openProfileSetup} />
            ) : null}

            <View style={styles.categoryGrid}>
              {categoryGroups.map((group) => {
                const first = categories.find((cat) => cat.groupKey === group.key);
                const selected = categoryGroup === group.key;
                return (
                  <Pressable
                    key={group.key}
                    accessibilityRole="button"
                    accessibilityLabel={group.name}
                    onPress={() => setCategoryGroup((prev) => (prev === group.key ? 'all' : group.key))}
                    style={styles.categoryItem}
                  >
                    <View style={[styles.categoryTile, selected && styles.categoryTileActive]}>
                      <MaterialCommunityIcons
                        name={(first?.icon ?? 'briefcase-outline') as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={26}
                        color={first?.color ?? theme.colors.primary}
                      />
                    </View>
                    <Text style={styles.categoryLabel} numberOfLines={2}>
                      {group.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>View All</Text>
              </Pressable>
            </View>

            {popularServices.length > 0 ? (
              <FlatList
                horizontal
                data={popularServices}
                keyExtractor={(item) => `service-${item.key}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serviceRow}
                renderItem={({ item }) => (
                  <ServiceCard
                    meta={item}
                    count={item.count}
                    minPay={item.minPay}
                    onPress={() => setCategoryGroup((prev) => (prev === item.key ? 'all' : item.key))}
                  />
                )}
              />
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>
            </View>
          </>
        }
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>{t('noResults')}</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.footerSpace} />
          )
        }
      />

      <WelcomeModal
        visible={!!welcome}
        name={welcome?.name ?? ''}
        isNewUser={welcome?.isNewUser ?? false}
        onClose={dismissWelcome}
      />

      <LocationPickerModal
        visible={locationPickerVisible}
        initialLocation={currentUser?.location ?? null}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={handleLocationSave}
      />

      {remoteSettings['mobile.loginAnnouncement'] ? (
        <AnnouncementModal
          visible={shouldShowAnnouncement}
          announcement={remoteSettings['mobile.loginAnnouncement']}
          onClose={dismissAnnouncement}
        />
      ) : null}

      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.menuTitle}>Menu</Text>
            {canPost && (
              <MenuAction
                icon="plus-circle-outline"
                label="Post a Job"
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('PostTab', { screen: 'PostJob' });
                }}
              />
            )}
            <MenuAction
              icon="compass-outline"
              label={t('navExplore')}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('ExploreTab', { screen: 'ExploreMain' });
              }}
            />
            <MenuAction
              icon="chat-processing-outline"
              label={t('navChat')}
              onPress={() => {
                setMenuVisible(false);
                // 'both' accounts have no ChatTab (Explore takes that slot) — Chat is registered
                // inside the Profile stack for them instead. See MainTabNavigator's hideChatTab.
                if (accountType === 'both') {
                  navigation.navigate('ProfileTab', { screen: 'ChatList' });
                } else {
                  navigation.navigate('ChatTab', { screen: 'ChatList' });
                }
              }}
            />
            <MenuAction
              icon="account-circle-outline"
              label={t('navProfile')}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
              }}
            />
            <MenuAction
              icon="logout"
              label={t('logout')}
              destructive
              onPress={() => {
                setMenuVisible(false);
                logout();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const ServiceCard: React.FC<{
  meta: { key: string; name: string; color: string; icon: string };
  count: number;
  minPay: number;
  onPress: () => void;
}> = ({
  meta,
  count,
  minPay,
  onPress,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta.name}
      onPress={onPress}
      style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}
    >
      <View style={[styles.serviceThumb, { backgroundColor: `${meta.color}1A` }]}>
        <MaterialCommunityIcons
          name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={38}
          color={meta.color}
        />
      </View>
      <Text style={styles.serviceTitle} numberOfLines={1}>
        {meta.name}
      </Text>
      <Text style={styles.servicePrice} numberOfLines={1}>{`${count} job${count === 1 ? '' : 's'} • From ₹${minPay}`}</Text>
    </Pressable>
  );
};

const ProfileIncompleteNotice: React.FC<{
  tasks: ReturnType<typeof getProfileCompletionTasks>;
  onPress: () => void;
}> = ({ tasks, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Incomplete setup"
    onPress={onPress}
    style={({ pressed }) => [styles.profileNotice, pressed && styles.pressed]}
  >
    <View style={styles.profileNoticeIcon}>
      <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.primary} />
    </View>
    <View style={styles.profileNoticeCopy}>
      <Text style={styles.profileNoticeTitle}>Setup incomplete</Text>
      <Text style={styles.profileNoticeText} numberOfLines={1}>
        {tasks.map((task) => task.title).join(', ')} complete nahi hai
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
  </Pressable>
);

const MenuAction: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}> = ({ icon, label, destructive, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuAction, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} size={23} color={destructive ? theme.colors.danger : theme.colors.text} />
    <Text style={[styles.menuActionText, destructive && styles.menuActionTextDestructive]}>{label}</Text>
    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  stickyHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingCopy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 16,
    flexShrink: 1,
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.danger,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  searchPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BANNER_HEIGHT,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  bannerCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
    color: '#5A2E10',
  },
  bannerTitleStrong: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    color: '#3D1B06',
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 42,
  },
  bannerCtaText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  // Fills the card's full height and right edge; the card's radius clips it.
  bannerImageWrap: {
    width: HERO_SLOT_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerImage: {
    width: HERO_IMAGE_WIDTH,
    height: BANNER_HEIGHT,
    // The wide art is pulled left so the worker, who sits in its right third,
    // lands centred in this narrow slot.
    marginLeft: -HERO_FOCUS_OFFSET,
    resizeMode: 'cover',
  },
  profileNotice: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    minHeight: 54,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  profileNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNoticeCopy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  profileNoticeTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  profileNoticeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  categoryTile: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryTileActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    ...theme.typography.tiny,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  seeAll: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  serviceRow: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  serviceCard: {
    width: 150,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xs,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  serviceThumb: {
    height: 92,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    marginHorizontal: 4,
  },
  servicePrice: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 92,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.bodyLg,
    color: theme.colors.textMuted,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
  },
  footerSpace: {
    height: theme.spacing.xl,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  menuTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  menuAction: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  menuActionText: {
    flex: 1,
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  menuActionTextDestructive: {
    color: theme.colors.danger,
  },
  pressed: {
    opacity: 0.72,
  },
});
