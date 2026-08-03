const toGeoPoint = (location) => ({
  type: 'Point',
  coordinates: [location.lng, location.lat],
  address: location.address,
});

module.exports = { toGeoPoint };
