import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { PostStackParamList, MainTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PostStackParamList, 'PostSuccess'>;

export const PostSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useApp();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const goHome = () => {
    tabNavigation.navigate('HomeTab', { screen: 'HomeFeed' });
    // Runs after the tab switch so PostJob is reset to its initial screen
    // for next time, without fighting the tab navigation above.
    navigation.reset({ index: 0, routes: [{ name: 'PostJob' }] });
  };

  const postAnother = () => {
    navigation.reset({ index: 0, routes: [{ name: 'PostJob' }] });
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-bold" size={56} color={theme.colors.success} />
        </View>
        <Text style={styles.title}>{t('jobPostedSuccess')}</Text>
      </View>
      <View style={styles.footer}>
        <Button label={t('navHome')} onPress={goHome} fullWidth />
        <Button label={t('postAJob')} onPress={postAnother} variant="outline" fullWidth style={styles.secondaryBtn} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: theme.spacing.lg,
  },
  secondaryBtn: {
    marginTop: theme.spacing.sm,
  },
});
