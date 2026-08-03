// Verbose "2 Hours Ago" phrasing — job lists lean on recency, so the unit is
// spelled out rather than abbreviated.
export const timeAgo = (iso: string): string => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} ${mins === 1 ? 'Minute' : 'Minutes'} Ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'} Ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} Days Ago`;
};
