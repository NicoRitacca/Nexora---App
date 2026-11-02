export async function fetchOpportunities() {
  const res = await fetch('/opportunities.json')
  if (!res.ok) throw new Error('Failed to load opportunities')
  return res.json()
}
