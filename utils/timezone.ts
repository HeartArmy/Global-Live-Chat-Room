export function getCurrentTimestamp(): { timestamp: Date; timezone: string; formatted: string } {
  const now = new Date()
  const timezone = 'UTC' // Using UTC as the global standard
  
  // Format: "Dec 25, 2024 at 3:45 PM UTC"
  const formatted = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' UTC'
  
  return {
    timestamp: now,
    timezone,
    formatted
  }
}

export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
  
  // For older messages, show the full date
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' UTC'
}

export function formatAbsolute(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' UTC'
}
