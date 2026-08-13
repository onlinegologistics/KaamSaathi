import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

interface LogoLoaderProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 44, style }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.08],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.2],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 0.08],
  });
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrap, { width: size * 1.95, height: size * 1.95 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size * 1.72,
            height: size * 1.72,
            borderRadius: size * 0.86,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size * 1.42,
            height: size * 1.42,
            borderRadius: size * 0.71,
            transform: [{ rotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.logoPlate,
          {
            width: size,
            height: size,
            borderRadius: size * 0.32,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <MaterialCommunityIcons name="handshake" size={size * 0.58} color={theme.colors.primary} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: theme.colors.primary,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: theme.colors.primaryLight,
    borderTopColor: theme.colors.primary,
    borderRightColor: 'rgba(244, 91, 24, 0.25)',
  },
  logoPlate: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },
});
