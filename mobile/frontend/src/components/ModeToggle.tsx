import React from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useApp, UserMode } from '../context/AppContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ModeToggle: React.FC = () => {
  const { mode, setMode, t } = useApp();

  const select = (next: UserMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
  };

  return (
    <View style={styles.container}>
      <Segment
        active={mode === 'worker'}
        label={t('workerMode')}
        icon="account-hard-hat"
        onPress={() => select('worker')}
      />
      <Segment
        active={mode === 'employer'}
        label={t('employerMode')}
        icon="briefcase-account"
        onPress={() => select('employer')}
      />
    </View>
  );
};

const Segment: React.FC<{
  active: boolean;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}> = ({ active, label, icon, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
    onPress={onPress}
    style={[styles.segment, active && styles.segmentActive]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={18}
      color={active ? theme.colors.textInverse : theme.colors.textSecondary}
    />
    <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    minHeight: 40,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.textInverse,
  },
});
