import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { AuthStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type IllustrationVariant = 'brand' | 'jobSearch' | 'professional' | 'simple';

type OnboardingPage = {
  title: string;
  accent?: string;
  subtitle: string;
  icon: IconName;
  tint: 'orange' | 'green';
  illustration: IllustrationVariant;
};

const defaultPages: OnboardingPage[] = [
  {
    title: 'KaamSaathi',
    subtitle: 'Find work. Find workers. Instantly.',
    icon: 'handshake',
    tint: 'orange',
    illustration: 'brand',
  },
  {
    title: 'Find the',
    accent: 'Right Job',
    subtitle: 'Explore thousands of job opportunities near you.',
    icon: 'magnify',
    tint: 'orange',
    illustration: 'jobSearch',
  },
  {
    title: 'Hire Trusted',
    accent: 'Professionals',
    subtitle: 'Post your job and connect with verified experts.',
    icon: 'shield-check',
    tint: 'orange',
    illustration: 'professional',
  },
  {
    title: 'Work Made',
    accent: 'Simple',
    subtitle: 'Quick process, safe payments and reliable support.',
    icon: 'cellphone-check',
    tint: 'orange',
    illustration: 'simple',
  },
];

const VALID_ICONS = new Set(Object.keys(MaterialCommunityIcons.glyphMap));
const isIconName = (value: unknown): value is IconName => typeof value === 'string' && VALID_ICONS.has(value);
const isTint = (value: unknown): value is OnboardingPage['tint'] => value === 'orange' || value === 'green';

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { remoteSettings } = useApp();
  const [index, setIndex] = useState(0);

  const pages = useMemo(() => {
    const remoteSlides =
      remoteSettings['mobile.authFlow.content']?.onboardingSlides ?? remoteSettings['mobile.onboarding.slides'];

    return defaultPages.map((fallback, i) => {
      const remote = remoteSlides?.[i];
      return {
        ...fallback,
        title: remote?.title ?? fallback.title,
        accent: remote?.accent ?? fallback.accent,
        subtitle: remote?.subtitle ?? fallback.subtitle,
        icon: isIconName(remote?.icon) ? remote.icon : fallback.icon,
        tint: isTint(remote?.tint) ? remote.tint : fallback.tint,
      };
    });
  }, [remoteSettings]);

  const workerImageSource: ImageSourcePropType = remoteSettings['mobile.home.heroImageUrl']
    ? { uri: remoteSettings['mobile.home.heroImageUrl'] }
    : require('../../../assets/home-hero-worker.png');

  const page = pages[index] ?? pages[0];
  const isFirst = index === 0;
  const isLast = index === pages.length - 1;

  const goLogin = () => navigation.navigate('PhoneEntry');

  const goNext = () => {
    if (isLast) {
      goLogin();
      return;
    }
    setIndex((value) => Math.min(value + 1, pages.length - 1));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={isFirst ? 'light' : 'dark'} />
      {isFirst ? (
        <BrandSlide page={page} onNext={goNext} onSkip={goLogin} />
      ) : (
        <IntroSlide
          page={page}
          index={index - 1}
          total={pages.length - 1}
          workerImageSource={workerImageSource}
          onNext={goNext}
        />
      )}
    </View>
  );
};

const BrandSlide: React.FC<{ page: OnboardingPage; onNext: () => void; onSkip: () => void }> = ({
  page,
  onNext,
  onSkip,
}) => (
  <LinearGradient colors={['#FF7B17', theme.colors.primary, theme.colors.primaryDark]} style={styles.brandPage}>
    <View pointerEvents="none" style={styles.brandRings}>
      <View style={[styles.brandRing, styles.brandRingOne]} />
      <View style={[styles.brandRing, styles.brandRingTwo]} />
      <View style={[styles.brandRing, styles.brandRingThree]} />
      <View style={[styles.brandRing, styles.brandRingFour]} />
    </View>

    <View style={styles.brandCenter}>
      <View style={styles.brandLogoShadow}>
        <View style={styles.brandLogo}>
          <MaterialCommunityIcons name={page.icon} size={52} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.brandTitle}>{page.title}</Text>
      <Text style={styles.brandSubtitle}>{page.subtitle}</Text>
    </View>

    <View style={styles.brandBottom}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get Started"
        onPress={onNext}
        style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}
      >
        <Text style={styles.brandButtonText}>Get Started</Text>
        <View style={styles.brandButtonIcon}>
          <MaterialCommunityIcons name="arrow-right" size={25} color={theme.colors.primary} />
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip for now" onPress={onSkip} hitSlop={10}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  </LinearGradient>
);

const IntroSlide: React.FC<{
  page: OnboardingPage;
  index: number;
  total: number;
  workerImageSource: ImageSourcePropType;
  onNext: () => void;
}> = ({ page, index, total, workerImageSource, onNext }) => {
  const isLast = index === total - 1;

  return (
    <View style={styles.introPage}>
      <View style={styles.introCopy}>
        <Text style={styles.introTitle}>
          {page.title}
          {page.accent ? '\n' : null}
          {page.accent ? <Text style={styles.introTitleAccent}>{page.accent}</Text> : null}
        </Text>
        <Text style={styles.introSubtitle}>{page.subtitle}</Text>
      </View>

      <View style={styles.artArea}>
        <IntroIllustration page={page} workerImageSource={workerImageSource} />
      </View>

      <View style={styles.introBottom}>
        <Dots current={index} total={total} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get Started' : 'Next'}
          onPress={onNext}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const IntroIllustration: React.FC<{ page: OnboardingPage; workerImageSource: ImageSourcePropType }> = ({
  page,
  workerImageSource,
}) => {
  if (page.illustration === 'simple') {
    return <PhoneCheckIllustration />;
  }

  if (page.illustration === 'jobSearch') {
    return (
      <View style={styles.artScene}>
        <View style={styles.artBlob} />
        <FloatingIcon icon="magnify" style={styles.searchBadge} />
        <FloatingIcon icon="briefcase" style={styles.briefcaseBadge} />
        <View style={styles.personClip}>
          <Image source={workerImageSource} style={styles.workerPortrait} />
        </View>
        <View style={styles.miniPhone}>
          <View style={styles.miniPhoneScreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.artScene}>
      <View style={styles.artBlob} />
      <View style={[styles.personClip, styles.professionalClip]}>
        <Image source={workerImageSource} style={styles.workerPortrait} />
      </View>
      <FloatingIcon icon="shield-check" style={styles.shieldBadge} large />
    </View>
  );
};

const PhoneCheckIllustration = () => (
  <View style={styles.artScene}>
    <View style={styles.artBlob} />
    <View style={styles.phoneFrame}>
      <View style={styles.phoneNotch} />
      <View style={styles.phoneLine} />
      <View style={styles.checkHalo}>
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons name="check" size={42} color={theme.colors.textInverse} />
        </View>
      </View>
      <View style={[styles.phoneLine, styles.phoneLineShort]} />
      <View style={styles.phoneCta} />
    </View>
  </View>
);

const FloatingIcon: React.FC<{ icon: IconName; style: StyleProp<ViewStyle>; large?: boolean }> = ({
  icon,
  style,
  large,
}) => (
  <View style={[styles.floatingIcon, large && styles.floatingIconLarge, style]}>
    <MaterialCommunityIcons name={icon} size={large ? 36 : 31} color={theme.colors.primary} />
  </View>
);

const Dots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={styles.dots}>
    {Array.from({ length: total }).map((_, itemIndex) => (
      <View key={itemIndex} style={[styles.dot, itemIndex === current && styles.dotActive]} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  brandPage: {
    flex: 1,
    paddingHorizontal: 34,
    paddingTop: 46,
    paddingBottom: 26,
    overflow: 'hidden',
  },
  brandRings: {
    position: 'absolute',
    top: 112,
    left: -18,
    right: -18,
    height: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 999,
  },
  brandRingOne: {
    width: 188,
    height: 188,
  },
  brandRingTwo: {
    width: 258,
    height: 258,
  },
  brandRingThree: {
    width: 326,
    height: 326,
  },
  brandRingFour: {
    width: 394,
    height: 394,
  },
  brandCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 44,
  },
  brandLogoShadow: {
    shadowColor: '#7A2605',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
  brandLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  brandTitle: {
    ...theme.typography.h1,
    color: theme.colors.textInverse,
    fontSize: 31,
    lineHeight: 38,
    textAlign: 'center',
  },
  brandSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textInverse,
    marginTop: 9,
    textAlign: 'center',
    fontWeight: '700',
  },
  brandBottom: {
    alignItems: 'center',
  },
  brandButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
    shadowColor: '#7A2605',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  brandButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  brandButtonIcon: {
    position: 'absolute',
    right: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...theme.typography.tiny,
    color: theme.colors.textInverse,
    fontWeight: '700',
    opacity: 0.9,
  },
  introPage: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 36,
    paddingTop: 68,
    paddingBottom: 31,
  },
  introCopy: {
    minHeight: 122,
    justifyContent: 'flex-end',
  },
  introTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'left',
  },
  introTitleAccent: {
    color: theme.colors.primary,
  },
  introSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: 10,
    maxWidth: 242,
    fontWeight: '600',
    lineHeight: 20,
  },
  artArea: {
    flex: 1,
    minHeight: 286,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artScene: {
    width: 292,
    height: 278,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBlob: {
    position: 'absolute',
    bottom: 31,
    width: 252,
    height: 205,
    borderRadius: 66,
    backgroundColor: '#FFF3EA',
  },
  personClip: {
    position: 'absolute',
    bottom: 24,
    width: 154,
    height: 206,
    borderRadius: 38,
    overflow: 'hidden',
    backgroundColor: '#FFE0C7',
  },
  professionalClip: {
    width: 176,
    height: 214,
    borderRadius: 42,
  },
  workerPortrait: {
    position: 'absolute',
    left: -250,
    bottom: 0,
    width: 492,
    height: 220,
    resizeMode: 'cover',
  },
  miniPhone: {
    position: 'absolute',
    left: 114,
    bottom: 84,
    width: 27,
    height: 43,
    borderRadius: 7,
    backgroundColor: '#202226',
    borderWidth: 2,
    borderColor: '#2B2D31',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  miniPhoneScreen: {
    width: 16,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#F7F7F7',
  },
  floatingIcon: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
    elevation: 4,
  },
  floatingIconLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  searchBadge: {
    left: 17,
    top: 49,
  },
  briefcaseBadge: {
    right: 18,
    top: 58,
  },
  shieldBadge: {
    right: 24,
    top: 78,
  },
  phoneFrame: {
    width: 128,
    height: 203,
    borderRadius: 26,
    borderWidth: 5,
    borderColor: '#FF7040',
    backgroundColor: '#FFF8F4',
    alignItems: 'center',
    paddingTop: 25,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 5,
    transform: [{ rotate: '-4deg' }],
  },
  phoneNotch: {
    position: 'absolute',
    top: -1,
    width: 45,
    height: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#FF7040',
  },
  phoneLine: {
    width: 74,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFE5D7',
    marginBottom: 19,
  },
  phoneLineShort: {
    width: 58,
    marginTop: 14,
    marginBottom: 18,
  },
  checkHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE3D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 59,
    height: 59,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCta: {
    width: 70,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#FFC5A6',
  },
  introBottom: {
    marginTop: 'auto',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 29,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D8D8D8',
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.primary,
  },
  primaryButton: {
    width: '100%',
    minHeight: 55,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 3,
  },
  primaryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
