const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number => {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (km: number): string => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
