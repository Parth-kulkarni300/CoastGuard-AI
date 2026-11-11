// Queues emergency/broadcast requests that failed to reach the backend (no
// signal) and resends them the moment connectivity returns, so nothing a
// tourist or boatman sent while offline is silently lost.

type QueuedAction = {
  id: string
  endpoint: string
  fields: Record<string, string>
  timestamp: string
}

const STORAGE_KEY = 'cg_offline_queue'
const QUEUE_EVENT = 'cg-queue-changed'

function readQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is QueuedAction =>
            Boolean(item && typeof item.endpoint === 'string' && item.fields && typeof item.fields === 'object')
        )
      : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    if (queue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { count: queue.length } }))
  } catch {}
}

export function queueAction(endpoint: string, fields: Record<string, string>): number {
  const queue = readQueue()
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    endpoint,
    fields,
    timestamp: new Date().toISOString()
  })
  writeQueue(queue)
  return queue.length
}

export function getQueueCount(): number {
  return readQueue().length
}

export function onQueueChange(handler: (count: number) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail?.count ?? getQueueCount())
  window.addEventListener(QUEUE_EVENT, listener)
  return () => window.removeEventListener(QUEUE_EVENT, listener)
}

// Resends every queued action; anything that still fails (still offline)
// stays queued for the next retry. Returns how many were sent successfully.
export async function flushQueue(): Promise<number> {
  const queue = readQueue()
  if (queue.length === 0) return 0

  const stillQueued: QueuedAction[] = []
  let sent = 0

  for (const action of queue) {
    try {
      const fd = new FormData()
      Object.entries(action.fields).forEach(([key, value]) => fd.append(key, value))
      const res = await fetch(action.endpoint, { method: 'POST', body: fd })
      if (res.ok) {
        sent++
      } else {
        stillQueued.push(action)
      }
    } catch {
      stillQueued.push(action)
    }
  }

  writeQueue(stillQueued)
  return sent
}
