// SPDX-License-Identifier: Apache-2.0
//
// KB UI config for <Backlinks>/<GraphView> (labels, order, type colors).
// Pure data, no node imports — safe to import into the client bundle.

export const blogKbUi = {
  relatedPredicate: 'schema:relatedLink',
  inverseLabels: {
    'schema:mentions': 'Mentioned in',
    'schema:about': 'Subject of',
    'schema:isPartOf': 'Includes',
    'schema:author': 'Author of'
  },
  order: ['schema:mentions', 'schema:about', 'schema:isPartOf', 'schema:author'],
  typeColors: {
    BlogPosting: '#0891b2',
    Person: '#b8860b',
    CollectionPage: '#8a6d00',
    WebPage: '#6e6e73'
  }
}
