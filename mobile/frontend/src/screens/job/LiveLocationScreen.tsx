import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { getSocket } from '../../services/socket';
import { getJobLocations } from '../../services/api';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LiveLocation'>;

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };

interface LocationUpdatePayload {
  jobId: string;
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Reused from every screen that can open it (JobDetail, JobApplicantsDetail) — same
// component regardless of whether the current user is the poster or the worker.
export const LiveLocationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, otherUserName } = route.params;
  const { accessToken, currentUser } = useApp();
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const [sharing, setSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [otherLocation, setOtherLocation] = useState<{ latitude: number; longitude: number; updatedAt: string } | null>(
    null
  );

  // Seed the map with whatever last-known position exists before the first live tick arrives.
  useEffect(() => {
    if (!accessToken) return;
    getJobLocations(accessToken, jobId)
      .then((res) => {
        const other = res.data.find((share) => share.userId !== currentUser?.id);
        if (other) {
          setOtherLocation({ latitude: other.latitude, longitude: other.longitude, updatedAt: other.updatedAt });
        }
      })
      .catch(() => {});
  }, [accessToken, jobId, currentUser?.id]);

  const stopSharing = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setSharing(false);
    getSocket()?.emit('location:stop', { jobId });
  }, [jobId]);

  // Join the job's location room on mount (needed to receive the other side's updates even
  // if this user never starts sharing themselves), leave cleanly on unmount.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('location:join', { jobId }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) {
        Alert.alert('Live location unavailable', ack?.error || 'This job is not active for live location.');
      }
    });

    const onUpdate = (payload: LocationUpdatePayload) => {
      if (payload.jobId !== jobId || payload.userId === currentUser?.id) return;
      setOtherLocation({ latitude: payload.latitude, longitude: payload.longitude, updatedAt: payload.timestamp });
    };
    const onStopped = (payload: { jobId: string; userId: string }) => {
      if (payload.jobId !== jobId || payload.userId === currentUser?.id) return;
      setOtherLocation(null);
    };

    socket.on('location:update', onUpdate);
    socket.on('location:stopped', onStopped);

    return () => {
      socket.off('location:update', onUpdate);
      socket.off('location:stopped', onStopped);
      watchRef.current?.remove();
      watchRef.current = null;
      socket.emit('location:stop', { jobId });
    };
  }, [jobId, currentUser?.id]);

  const startSharing = async () => {
    if (starting || sharing) return;
    setStarting(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow location access to share your live location.');
        return;
      }

      const initial = await Location.getCurrentPositionAsync({});
      setMyLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
      mapRef.current?.animateToRegion(
        {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        400
      );

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 25 },
        (position) => {
          setMyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          getSocket()?.emit(
            'location:update',
            {
              jobId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy ?? undefined,
              heading: position.coords.heading ?? undefined,
              speed: position.coords.speed ?? undefined,
            },
            (ack: { ok: boolean; error?: string }) => {
              // Server re-checks the job is still in-progress on every tick — if it just
              // completed/was cancelled/reassigned, stop draining the GPS locally too.
              if (!ack?.ok) stopSharing();
            }
          );
        }
      );
      setSharing(true);
    } catch {
      Alert.alert('Could not start sharing', 'Please check your location settings and try again.');
    } finally {
      setStarting(false);
    }
  };

  const initialRegion = {
    ...(myLocation ?? otherLocation ?? DEFAULT_CENTER),
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Live Location</Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion}>
          {myLocation && (
            <Marker coordinate={myLocation} pinColor={theme.colors.primary} title="You" />
          )}
          {otherLocation && (
            <Marker coordinate={otherLocation} pinColor={theme.colors.secondary} title={otherUserName} />
          )}
        </MapView>
      </View>

      <View style={styles.footer}>
        {sharing ? (
          <>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={theme.colors.success} />
              <Text style={styles.statusText}>You are sharing your live location with {otherUserName} for this job.</Text>
            </View>
            <Button label="Stop Sharing" onPress={stopSharing} variant="outline" fullWidth />
          </>
        ) : (
          <Button
            label="Start Sharing"
            onPress={startSharing}
            loading={starting}
            fullWidth
            icon={<MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.textInverse} />}
          />
        )}
        {!otherLocation && (
          <Text style={styles.hintText}>
            {otherUserName} hasn't started sharing their location yet.
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  statusText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
