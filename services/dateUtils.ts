
export const isValidDateString = (dateStr: any): boolean => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export const safeParseYYYYMMDD = (dateString: any): Date | null => {
    if (typeof dateString !== 'string') return null;
    
    // Strict regex to ensure format is exactly YYYY-MM-DD
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    
    const [, year, month, day] = match.map(Number);
    
    // Create date in UTC to avoid timezone issues.
    const date = new Date(Date.UTC(year, month - 1, day));

    // Check if the created date is valid and matches the input numbers.
    // This catches invalid dates like '2024-02-31'.
    if (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    ) {
        return date;
    }
    
    return null;
};
