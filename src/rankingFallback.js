// Basic, non-AI ranking used both as the default sort order and as the
// fallback shown when the AI ranking call fails or times out: full-ZIP-match
// opportunities ahead of border-area (partial ZIP) ones, newest filing first.
export function rankOpportunitiesBasic(opportunities) {
  return [...opportunities].sort((a, b) => {
    if (a.zipCoverage !== b.zipCoverage) {
      return a.zipCoverage === 'partial' ? 1 : -1
    }
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  })
}
