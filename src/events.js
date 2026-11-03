async function fetchEventsFile(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchEvents() {
  const [handEntered, rssEvents] = await Promise.all([
    fetchEventsFile('/events.json'),
    fetchEventsFile('/events-feed.json'),
  ])
  return [...handEntered, ...rssEvents]
}
