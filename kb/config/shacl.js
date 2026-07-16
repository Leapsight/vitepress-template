// SPDX-License-Identifier: Apache-2.0
//
// SHACL gate. Validates the KB's expanded RDF triples against a shapes graph
// (Turtle) and reports violations. The loader calls this after the broken-xref
// check and aborts the build when the graph does not conform.
//
// The heavy RDF stack (@zazuko/env-node + rdf-validate-shacl) is only pulled
// in by the loader's dynamic import of this module, so it never loads unless
// the KB data (with a shapesPath) is actually consumed.

import rdf from '@zazuko/env-node'
import SHACLValidator from 'rdf-validate-shacl'

/**
 * Validate `triples` against the Turtle shapes graph at `shapesPath`.
 * Literals are reconstructed as xsd:string (RDF 1.1 default) — sufficient for
 * the label/nodeKind constraints these shapes carry.
 *
 * @param {Array<{subject,predicate,object,objectIsLiteral?}>} triples
 * @param {string} shapesPath
 * @returns {Promise<{conforms:boolean, report:string, count:number}>}
 */
export async function validateTriples(triples, shapesPath) {
  const shapes = await rdf.dataset().import(rdf.fromFile(shapesPath))

  const data = rdf.dataset()
  for (const t of triples) {
    const object = t.objectIsLiteral ? rdf.literal(t.object) : rdf.namedNode(t.object)
    data.add(rdf.quad(rdf.namedNode(t.subject), rdf.namedNode(t.predicate), object))
  }

  const report = await new SHACLValidator(shapes, { factory: rdf }).validate(data)
  if (report.conforms) return { conforms: true, report: '', count: 0 }

  const lines = report.results.map((r) => {
    const focus = r.focusNode?.value ?? '?'
    const path = r.path?.value ? ` [${r.path.value}]` : ''
    const message =
      (r.message ?? []).map((m) => m.value).join('; ') ||
      r.sourceConstraintComponent?.value ||
      'constraint violation'
    return `  • ${focus}${path}\n      ${message}`
  })
  return { conforms: false, report: lines.join('\n'), count: report.results.length }
}
