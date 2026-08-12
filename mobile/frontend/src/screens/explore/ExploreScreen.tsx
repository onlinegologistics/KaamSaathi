import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Share, ImageBackground } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../context/AppContext';
import { listAds, BackendAd } from '../../services/api';
import { ExploreStackParamList, MainTabParamList } from '../../navigation/types';

type ExploreNavigation = CompositeNavigationProp<
  NativeStackScreenProps<ExploreStackParamList, 'ExploreMain'>['navigation'],
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = { navigation: ExploreNavigation };

type Tip = { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string };

const WORKER_TIPS: Tip[] = [
  { icon: 'card-account-details-outline', text: 'Complete your KYC to unlock more job categories.' },
  { icon: 'account-edit-outline', text: 'Add your skills and experience — it shows up on your profile for employers.' },
  { icon: 'map-marker-check-outline', text: 'Keep your location updated for jobs closer to you.' },
];

const EMPLOYER_TIPS: Tip[] = [
  { icon: 'text-box-check-outline', text: 'Clear, specific job titles get applicants faster.' },
  { icon: 'cash-check', text: 'Use the price suggestion when posting — fair pay attracts better workers.' },
  { icon: 'account-group-outline', text: 'Review ratings before accepting an applicant.' },
];

type ActionCard = {
  key: string;
  title: string;
  body: string;
  ctaLabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  bg: string;
  accent: string;
  onPress: () => void;
};

export const ExploreScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser } = useApp();
  const accountType = currentUser?.accountType ?? 'worker';
  const isWorker = accountType === 'worker';
  const isEmployer = accountType === 'employer';

  const [ads, setAds] = useState<BackendAd[]>([]);

  useEffect(() => {
    listAds(accountType)
      .then((res) => setAds(res.ads))
      .catch(() => setAds([]));
  }, [accountType]);

  const ad = ads[0];

  const handleInvite = () => {
    Share.share({
      message: 'Join me on AnyWork — find trusted work or hire verified help near you!',
    }).catch(() => {});
  };

  const tips = isEmployer ? EMPLOYER_TIPS : WORKER_TIPS;

  const cards: ActionCard[] = [
    !isEmployer && {
      key: 'find-work',
      title: 'Find Work',
      body: 'Browse verified jobs near you and apply in one tap.',
      ctaLabel: 'Find Work',
      icon: 'account-hard-hat',
      bg: '#FFE9DD',
      accent: theme.colors.primary,
      onPress: () => navigation.navigate('SearchTab', { screen: 'SearchMain' }),
    },
    !isWorker && {
      key: 'post-job',
      title: 'Post a Job',
      body: 'Post any job for free and get verified workers quickly.',
      ctaLabel: 'Post a Job',
      icon: 'clipboard-text-outline',
      bg: '#EFE7FB',
      accent: theme.colors.categoryElectrician,
      onPress: () => navigation.navigate('PostTab', { screen: 'PostJob' }),
    },
    {
      key: 'track',
      title: isEmployer ? 'View Applicants' : 'Track Applications',
      body: isEmployer
        ? "See who's applied to your job posts and manage them in one place."
        : 'Track all your applications and responses in one place.',
      ctaLabel: isEmployer ? 'View Applicants' : 'View Applications',
      icon: 'clipboard-check-outline',
      bg: theme.colors.successLight,
      accent: theme.colors.success,
      onPress: () =>
        navigation.navigate('ProfileTab', { screen: isEmployer ? 'JobApplicants' : 'MyApplications' }),
    },
    !isEmployer && {
      key: 'saved',
      title: 'Saved Jobs',
      body: 'Save jobs you like and apply later anytime.',
      ctaLabel: 'View Saved',
      icon: 'folder-star-outline',
      bg: theme.colors.accentLight,
      accent: theme.colors.accentDark,
      onPress: () => navigation.navigate('ProfileTab', { screen: 'SavedJobs' }),
    },
    {
      key: 'refer',
      title: 'Refer & Earn',
      body: 'Invite friends and earn exciting rewards together.',
      ctaLabel: 'Invite Now',
      icon: 'gift-outline',
      bg: '#FDE7EE',
      accent: '#D6567F',
      onPress: handleInvite,
    },
  ].filter(Boolean) as ActionCard[];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {ad ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => ad.ctaUrl && Linking.openURL(ad.ctaUrl).catch(() => {})}
            style={styles.adHeroWrap}
          >
            {ad.imageUrl ? (
              <ImageBackground source={{ uri: ad.imageUrl }} style={styles.adHero} imageStyle={styles.adHeroImage}>
                <View style={styles.adHeroScrim} />
                <AdHeroCopy ad={ad} />
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={[theme.colors.bannerStart, theme.colors.bannerEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adHero}
              >
                <AdHeroCopy ad={ad} />
              </LinearGradient>
            )}
          </Pressable>
        ) : (
          <LinearGradient
            colors={[theme.colors.bannerStart, theme.colors.bannerEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <MaterialCommunityIcons name="compass-outline" size={24} color={theme.colors.primaryDark} />
            <Text style={styles.heroTitle}>Everything AnyWork,{'\n'}in one place</Text>
            <Text style={styles.heroSubtitle}>Explore what you can do below.</Text>
          </LinearGradient>
        )}

        <Text style={styles.sectionTitle}>What you can do</Text>
        <View style={styles.actionList}>
          {cards.map((card) => (
            <Pressable
              key={card.key}
              accessibilityRole="button"
              onPress={card.onPress}
              style={({ pressed }) => [styles.actionCard, { backgroundColor: card.bg }, pressed && styles.pressed]}
            >
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{card.title}</Text>
                <Text style={styles.actionBody}>{card.body}</Text>
                <View style={[styles.actionCta, { backgroundColor: card.accent }]}>
                  <Text style={styles.actionCtaText}>{card.ctaLabel}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.textInverse} />
                </View>
              </View>
              <View style={[styles.actionIconBadge, { backgroundColor: `${card.accent}26` }]}>
                <MaterialCommunityIcons name={card.icon} size={38} color={card.accent} />
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tips to get the most out of AnyWork</Text>
        <View style={styles.tipList}>
          {tips.map((tip) => (
            <View key={tip.text} style={styles.tipRow}>
              <MaterialCommunityIcons name={tip.icon} size={18} color={theme.colors.secondary} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const AdHeroCopy: React.FC<{ ad: BackendAd }> = ({ ad }) => (
  <View style={styles.adHeroCopy}>
    <View style={styles.sponsoredTag}>
      <Text style={styles.sponsoredText}>Sponsored</Text>
    </View>
    <Text style={styles.adHeroTitle}>{ad.title}</Text>
    {!!ad.subtitle && <Text style={styles.adHeroSubtitle}>{ad.subtitle}</Text>}
    {!!ad.ctaLabel && (
      <View style={styles.adHeroCta}>
        <Text style={styles.adHeroCtaText}>{ad.ctaLabel}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.textInverse} />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  hero: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: 6,
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  adHeroWrap: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  adHero: {
    minHeight: 170,
    justifyContent: 'flex-end',
  },
  adHeroImage: {
    resizeMode: 'cover',
  },
  adHeroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 12, 6, 0.38)',
  },
  adHeroCopy: {
    padding: theme.spacing.lg,
    gap: 4,
  },
  sponsoredTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  sponsoredText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
    fontWeight: '800',
  },
  adHeroTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  adHeroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  adHeroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
    marginTop: theme.spacing.xs,
  },
  adHeroCtaText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  actionList: {
    gap: theme.spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  actionBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
  },
  actionCtaText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textInverse,
  },
  actionIconBadge: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  tipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});
