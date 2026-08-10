const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
  {
    groupKey: 'labor',
    groupName: 'Labor',
    items: [
      ['helper', 'Helper', 'account-hard-hat-outline', '#F45B18', 'Helper Work ID'],
      ['construction', 'Construction', 'hard-hat', '#E0A030', 'Construction Safety Card'],
      ['loading', 'Loading', 'package-variant-closed', '#A45E2D', 'Loading Work ID'],
      ['cleaning', 'Cleaning', 'spray-bottle', '#E8632F', 'Cleaning Work Certificate'],
    ],
  },
  {
    groupKey: 'skilled-workers',
    groupName: 'Skilled Workers',
    items: [
      ['electrician', 'Electrician', 'power-plug', '#7C5BE0', 'Electrician License'],
      ['plumber', 'Plumber', 'pipe-wrench', '#2F7FD4', 'Plumbing Certificate'],
      ['carpenter', 'Carpenter', 'hammer-screwdriver', '#8B5E34', 'Carpentry Work Certificate'],
      ['painter', 'Painter', 'format-paint', '#2E9E8B', 'Painting Work Certificate'],
    ],
  },
  {
    groupKey: 'professional',
    groupName: 'Professional',
    items: [
      ['graphic-designer', 'Graphic Designer', 'palette-outline', '#D946EF', 'Design Portfolio or Certificate'],
      ['video-editor', 'Video Editor', 'video-outline', '#EF4444', 'Editing Portfolio or Certificate'],
      ['developer', 'Developer', 'code-tags', '#2563EB', 'Developer Portfolio or Certificate'],
      ['accountant', 'Accountant', 'calculator-variant-outline', '#0F766E', 'Accounting Certificate'],
      ['teacher', 'Teacher', 'school-outline', '#C97700', 'Teaching Certificate'],
      ['lawyer', 'Lawyer', 'scale-balance', '#4B5563', 'Bar Council ID'],
      ['photographer', 'Photographer', 'camera-outline', '#7C3AED', 'Photography Portfolio or ID'],
    ],
  },
  {
    groupKey: 'home-services',
    groupName: 'Home Services',
    items: [
      ['maid', 'Maid', 'broom', '#E8632F', 'Maid Work ID'],
      ['cook', 'Cook', 'chef-hat', '#F97316', 'Cooking Work Certificate'],
      ['driver', 'Driver', 'card-account-details-star-outline', '#2E9E5B', 'Driving License'],
      ['baby-sitter', 'Baby Sitter', 'baby-face-outline', '#EC4899', 'Baby Sitter ID or Reference'],
    ],
  },
];

const flattenDefaultCategories = () =>
  DEFAULT_CATEGORIES.flatMap((group, groupIndex) =>
    group.items.map(([key, name, icon, color, kycDocumentLabel], itemIndex) => ({
      key,
      name,
      icon,
      color,
      kycDocumentLabel,
      groupKey: group.groupKey,
      groupName: group.groupName,
      sortOrder: groupIndex * 100 + itemIndex,
      isActive: true,
    }))
  );

const ensureDefaultCategories = async () => {
  const defaults = flattenDefaultCategories();
  await Promise.all(
    defaults.map((category) =>
      Category.updateOne(
        { key: category.key },
        {
          $setOnInsert: category,
        },
        { upsert: true }
      )
    )
  );
};

const listCategories = ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
};

module.exports = {
  DEFAULT_CATEGORIES,
  ensureDefaultCategories,
  flattenDefaultCategories,
  listCategories,
};
