const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

const requireApiKey = () => {
  if (!env.googleMapsServerApiKey) {
    throw new ApiError(503, 'Place search is not configured', 'PLACES_NOT_CONFIGURED');
  }
};

const autocomplete = async ({ input, lat, lng, sessionToken }) => {
  requireApiKey();

  const body = {
    input,
    ...(sessionToken ? { sessionToken } : {}),
    ...(lat !== undefined && lng !== undefined
      ? { locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } } }
      : {}),
  };

  let res;
  try {
    res = await fetch(`${PLACES_BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleMapsServerApiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(502, 'Place search is unavailable', 'PLACES_UPSTREAM_ERROR');
  }

  if (!res.ok) {
    throw new ApiError(502, 'Place search failed', 'PLACES_UPSTREAM_ERROR');
  }

  const data = await res.json();
  return (data.suggestions || [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction.placeId,
      text: s.placePrediction.text?.text ?? '',
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? '',
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
    }));
};

const getPlaceLocation = async (placeId, sessionToken) => {
  requireApiKey();

  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  let res;
  try {
    res = await fetch(`${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}${query}`, {
      headers: {
        'X-Goog-Api-Key': env.googleMapsServerApiKey,
        'X-Goog-FieldMask': 'location,formattedAddress',
      },
    });
  } catch {
    throw new ApiError(502, 'Place lookup is unavailable', 'PLACES_UPSTREAM_ERROR');
  }

  if (!res.ok) {
    throw new ApiError(502, 'Could not fetch place details', 'PLACES_UPSTREAM_ERROR');
  }

  const data = await res.json();
  if (!data.location) {
    throw new ApiError(404, 'Place not found', 'PLACE_NOT_FOUND');
  }

  return {
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    address: data.formattedAddress || '',
  };
};

module.exports = { autocomplete, getPlaceLocation };
