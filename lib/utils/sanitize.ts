export const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export const sanitizeTextArray = (values: string[]) =>
  values
    .map((value) => stripHtml(value))
    .filter(Boolean);