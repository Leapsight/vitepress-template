/**
 * Minimal slugifier for in-page anchors (replaces the
 * @sindresorhus/slugify dependency the original themes carried).
 */
export default function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
