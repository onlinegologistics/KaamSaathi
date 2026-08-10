const asyncHandler = require('../utils/asyncHandler');
const pricingService = require('../services/pricingService');

const getPriceSuggestion = asyncHandler(async (req, res) => {
  const { city, area, category, durationMinutes } = req.body;
  const data = await pricingService.getSuggestedMinimumPrice({ city, area, category, durationMinutes });
  res.json({ success: true, data });
});

module.exports = { getPriceSuggestion };
