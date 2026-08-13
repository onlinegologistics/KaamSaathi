import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  error?: string;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  style,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  ...rest
}) => {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={theme.colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          {...rest}
        />
        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel}
            onPress={onRightIconPress}
            hitSlop={10}
            style={styles.rightIconBtn}
          >
            <MaterialCommunityIcons name={rightIcon} size={20} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  inputRowError: {
    borderColor: theme.colors.danger,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  rightIconBtn: {
    marginLeft: theme.spacing.xs,
    padding: 2,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: 4,
  },
});
