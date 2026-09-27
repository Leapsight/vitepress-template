import { createKbBodiesLoader } from '@leapsight/vitepress-template/kb/loader'

// Rendered glossary term pages, for the concept panel. Imported dynamically by
// the theme, so it is its own chunk, fetched on the first Expand.
declare const data: Record<string, string>
export { data }

export default createKbBodiesLoader({ pattern: 'glossary/*.md' })
