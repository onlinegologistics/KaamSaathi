const asyncHandler = require('../utils/asyncHandler');
const placesService = require('../services/placesService');

const autocomplete = asyncHandler(async (req, res) => {
  const { input, lat, lng, sessionToken } = req.query;
  const suggestions = await placesService.autocomplete({ input, lat, lng, sessionToken });
  res.json({ success: true, data: suggestions });
});

const placeDetails = asyncHandler(async (req, res) => {
  const location = await placesService.getPlaceLocation(req.params.placeId, req.query.sessionToken);
  res.json({ success: true, location });
});

module.exports = { autocomplete, placeDetails };
