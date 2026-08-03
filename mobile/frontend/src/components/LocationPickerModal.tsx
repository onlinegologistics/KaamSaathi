import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Platform, Pressable, GestureResponderEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { useApp } from '../context/AppContext';

interface LocationValue {
  latitude: number;
  longitude: number;
  label: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  initialLocation?: LocationValue | null;
  onClose: () => void;
  onConfirm: (location: LocationValue) => void;
}

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };
// Roughly how many degrees the visible placeholder area spans, used only to
// simulate a plausible lat/lng when the user taps — no real map tiles here.
const DEGREES_SPAN = 0.05;

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}) => {
  const { t } = useApp();
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>(
    initialLocation ?? DEFAULT_CENTER
  );
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });
  const [surfaceSize, setSurfaceSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (visible) {
      setCoord(initialLocation ?? DEFAULT_CENTER);
      setPinOffset({ x: 0, y: 0 });
    }
  }, [visible, initialLocation]);

  const handleTap = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const dxRatio = locationX / surfaceSize.width - 0.5;
    const dyRatio = locationY / surfaceSize.height - 0.5;
    setPinOffset({ x: locationX - surfaceSize.width / 2, y: locationY - surfaceSize.height / 2 });
    setCoord({
      latitude: DEFAULT_CENTER.latitude - dyRatio * DEGREES_SPAN,
      longitude: DEFAULT_CENTER.longitude + dxRatio * DEGREES_SPAN,
    });
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: coord.latitude,
      longitude: coord.longitude,
      label: `Pinned location (${coord.latitude.toFixed(3)}, ${coord.longitude.toFixed(3)})`,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton name="close" accessibilityLabel={t('cancel')} onPress={onClose} />
          <Text style={styles.headerTitle}>{t('dropPinOnMap')}</Text>
          <View style={{ width: theme.MIN_TAP_TARGET }} />
        </View>

        <Pressable
          style={styles.mapWrap}
          onPress={handleTap}
          onLayout={(e) => setSurfaceSize(e.nativeEvent.layout)}
        >
          <View style={styles.gridBackground}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 14}%` }]} />
            ))}
          </View>

          <View
            pointerEvents="none"
            style={[
              styles.pin,
              { transform: [{ translateX: pinOffset.x }, { translateY: pinOffset.y - 20 }] },
            ]}
          >
            <MaterialCommunityIcons name="map-marker" size={44} color={theme.colors.primary} />
          </View>

          <View pointerEvents="none" style={styles.centerHint}>
            <Text style={styles.centerHintText}>{t('dropPinOnMap')}: Tap anywhere to place pin</Text>
          </View>
        </Pressable>

        <View style={styles.coordRow}>
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.coordText}>
            {coord.latitude.toFixed(4)}, {coord.longitude.toFixed(4)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Button label={t('done')} onPress={handleConfirm} fullWidth />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  mapWrap: {
    flex: 1,
    backgroundColor: theme.colors.secondaryLight,
    overflow: 'hidden',
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: theme.colors.secondary,
    opacity: 0.15,
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
  },
  centerHint: {
    position: 'absolute',
    top: theme.spacing.md,
    alignSelf: 'center',
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  centerHintText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  coordText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
  },
});
