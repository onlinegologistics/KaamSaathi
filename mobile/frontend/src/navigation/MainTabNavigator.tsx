import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { MainTabParamList } from './types';
import { HomeNavigator } from './HomeNavigator';
import { SearchNavigator } from './SearchNavigator';
import { PostNavigator } from './PostNavigator';
import { ChatNavigator } from './ChatNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { useApp } from '../context/AppContext';

// Note: screens that need the tab bar hidden while they're focused (Home's
// nested "Search" step, Chat's message thread) set that themselves via
// navigation.getParent()?.setOptions({ tabBarStyle }) — see SearchScreen.tsx
// and ChatThreadScreen.tsx. That's more reliable here than deriving it from
// getFocusedRouteNameFromRoute, since "Search" is also a route name inside
// SearchTab's own stack.

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  HomeTab: 'home-variant',
  SearchTab: 'magnify',
  ChatTab: 'chat-processing',
  ProfileTab: 'account-circle',
};

const labelKeys: Record<string, 'navHome' | 'navSearch' | 'navChat' | 'navProfile'> = {
  HomeTab: 'navHome',
  SearchTab: 'navSearch',
  ChatTab: 'navChat',
  ProfileTab: 'navProfile',
};

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useApp();

  const baseTabBarStyle = {
    position: 'absolute' as const,
    left: 18,
    right: 18,
    bottom: Math.max(insets.bottom, 12),
    height: 68,
    paddingBottom: 8,
    paddingTop: 9,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0,
    borderRadius: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  };

  return (
    <Tab.Navigator
      screenOptions={() => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: baseTabBarStyle,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: t('navHome'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icons.HomeTab} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchNavigator}
        options={{
          tabBarLabel: t('navSearch'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icons.SearchTab} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="PostTab"
        component={PostNavigator}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <PostTabIcon focused={focused} label={t('navPost')} />,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatNavigator}
        options={{
          tabBarLabel: t('navChat'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icons.ChatTab} size={size} color={color} />,
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: t('navProfile'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icons.ProfileTab} size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const PostTabIcon: React.FC<{ focused: boolean; label: string }> = ({ focused, label }) => (
  <View style={styles.postIconWrap}>
    <View style={[styles.postCircle, focused && styles.postCircleFocused]}>
      <MaterialCommunityIcons name="plus" size={22} color={theme.colors.textInverse} />
    </View>
    <Text style={styles.postLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  tabLabel: {
    ...theme.typography.tiny,
    fontWeight: '700',
  },
  postIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    top: Platform.OS === 'ios' ? 2 : 2,
  },
  postCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  postCircleFocused: {
    backgroundColor: theme.colors.primaryDark,
  },
  postLabel: {
    ...theme.typography.tiny,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
