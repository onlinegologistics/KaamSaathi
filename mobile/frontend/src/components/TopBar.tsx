import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../theme';
import { IconButton } from './IconButton';
import { useApp } from '../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TopBarProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  hasNotification?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSearchPress,
  onNotificationPress,
  onMenuPress,
  hasNotification,
}) => {
  const { t } = useApp();
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.appName}>{t('appName')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Current location" style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={17} color={theme.colors.primary} />
          <Text style={styles.locationText}>Pitampura, Delhi</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.primary} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        <IconButton name="magnify" accessibilityLabel={t('search')} onPress={onSearchPress} color={theme.colors.text} />
        <IconButton
          name="bell-outline"
          accessibilityLabel="Notifications"
          onPress={onNotificationPress}
          badge={hasNotification}
          color={theme.colors.text}
        />
        <IconButton name="menu" accessibilityLabel="Menu" onPress={onMenuPress} color={theme.colors.text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  appName: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
