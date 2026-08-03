import { colors } from '../theme/colors';
import { CategoryMeta } from '../types';

export const categories: CategoryMeta[] = [
  { key: 'homeRepair', labelKey: 'homeRepair', icon: 'hammer-screwdriver', color: colors.categoryHomeRepair },
  { key: 'cleaning', labelKey: 'cleaning', icon: 'spray-bottle', color: colors.categoryCleaning },
  { key: 'delivery', labelKey: 'delivery', icon: 'moped', color: colors.categoryDelivery },
  { key: 'construction', labelKey: 'construction', icon: 'hard-hat', color: colors.categoryConstruction },
  { key: 'electrician', labelKey: 'electrician', icon: 'power-plug', color: colors.categoryElectrician },
  { key: 'plumbing', labelKey: 'plumbing', icon: 'pipe-wrench', color: colors.categoryPlumbing },
  { key: 'painting', labelKey: 'painting', icon: 'format-paint', color: colors.categoryPainting },
];

export const getCategoryMeta = (key: string): CategoryMeta =>
  categories.find((c) => c.key === key) ?? categories[0];
