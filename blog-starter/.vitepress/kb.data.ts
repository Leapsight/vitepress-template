import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createKbLoader } from '@leapsight/vitepress-kb/loader'
import type { KbData } from '@leapsight/vitepress-kb'
import { blogKbConfig } from '@leapsight/vitepress-blog/config'

const ARTIFACT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/kb')

// `data` is materialised by VitePress's data-loader transform at build time;
// the theme imports it and provides it to the KB components.
declare const data: KbData
export { data }

export default createKbLoader(
  blogKbConfig({
    siteNamespace: 'https://blog.example.com/kb/',
    idPrefix: 'post',
    // Cross-site: references to `bondydoc:…` (or absolute bondy.io/kb URLs) are
    // recorded in the graph but not build-checked — the docs site isn't here.
    namespaces: { bondydoc: 'https://bondy.io/kb/' },
    enforce: true,
    artifactDir: ARTIFACT_DIR,
    ignore: ['**/node_modules/**', '**/.vitepress/**', '**/tags/**', '**/authors/**']
  })
)
