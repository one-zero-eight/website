export const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatWeekRange = (weekStart: Date) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
};
