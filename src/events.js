export async function fetchEvents() {
  const res = await fetch('/events.json')
  if (!res.ok) throw new Error('Failed to load events')
  return res.json()
}
