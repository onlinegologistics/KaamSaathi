const MinimumPriceRule = require('../models/MinimumPriceRule');

// Used only if an admin has never configured even a single global-default rule — keeps job
// posting from ever hard-failing just because pricing data doesn't exist yet.
const HARD_FALLBACK = { baseMinimumPrice: 300, hourlyRate: 50 };

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCaseInsensitive = (value) => new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
const blank = { $in: ['', null] };

// Priority: city+area+category -> city+category (any/no area) -> category only (any/no
// city) -> a single admin-configured global default (blank city, blank category).
const findRule = async ({ city, area, category }) => {
  const candidates = [];
  if (city && area && category) {
    candidates.push({ city: exactCaseInsensitive(city), area: exactCaseInsensitive(area), category, isActive: true });
  }
  if (city && category) {
    candidates.push({ city: exactCaseInsensitive(city), category, isActive: true });
  }
  if (category) {
    candidates.push({ city: blank, category, isActive: true });
  }
  candidates.push({ city: blank, category: blank, isActive: true });

  for (const filter of candidates) {
    // eslint-disable-next-line no-await-in-loop -- small, ordered fallback chain; not a hot loop
    const rule = await MinimumPriceRule.findOne(filter).sort({ updatedAt: -1 });
    if (rule) return rule;
  }
  return null;
};

const sourceForRule = (rule) => {
  if (!rule) return 'global_default';
  if (rule.city && rule.area && rule.category) return 'area_category';
  if (rule.city && rule.category) return 'city_category';
  if (rule.category) return 'category_default';
  return 'admin_global_default';
};

const roundToNearest10 = (value) => Math.round(value / 10) * 10;

const getSuggestedMinimumPrice = async ({ city, area, category, durationMinutes }) => {
  const rule = await findRule({ city, area, category });
  const baseMinimumPrice = rule?.baseMinimumPrice ?? HARD_FALLBACK.baseMinimumPrice;
  const hourlyRate = rule?.hourlyRate ?? HARD_FALLBACK.hourlyRate;

  const durationHours = (durationMinutes || 60) / 60;
  const durationPrice = hourlyRate ? hourlyRate * durationHours : 0;
  const suggestedMinimum = roundToNearest10(Math.max(baseMinimumPrice, durationPrice));

  return { suggestedMinimum, currency: 'INR', source: sourceForRule(rule) };
};

module.exports = { findRule, getSuggestedMinimumPrice };
