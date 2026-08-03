export async function saveAutosave(docJson: string): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  if (!db.objectStoreNames.contains(STORE)) {
    return
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)

    store.put(docJson, 'planta:autosave:current')

    const getSlotReq = store.get('planta:autosave:lastSlot')
    getSlotReq.onsuccess = () => {
      let lastSlot = getSlotReq.result
      if (typeof lastSlot !== 'number') {
        lastSlot = 0
      }

      const nextSlot = (lastSlot + 1) % 3
      store.put(docJson, 'planta:autosave:' + nextSlot)
      store.put(nextSlot, 'planta:autosave:lastSlot')
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function loadAutosave(): Promise<string | null> {
  const db = await openDatabase()
  if (!db) return null
  if (!db.objectStoreNames.contains(STORE)) return null

  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('planta:autosave:current')
    request.onsuccess = () => {
      if (typeof request.result === 'string') {
        resolve(request.result)
      } else {
        resolve(null)
      }
    }
    request.onerror = () => resolve(null)
  })
}

export class AutosaveScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private pendingJson: string | null = null
  private flushPromise: Promise<void> | null = null

  constructor(private saveFn: (json: string) => Promise<void>) {}

  schedule(json: string): void {
    this.pendingJson = json
    if (this.timer !== null) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush()
    }, 5000)
  }

  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.pendingJson === null) {
      return
    }

    const json = this.pendingJson
    this.pendingJson = null

    if (this.flushPromise) {
      await this.flushPromise
    }

    this.flushPromise = this.saveFn(json).finally(() => {
      this.flushPromise = null
    })

    return this.flushPromise
  }
}

const DATABASE = 'planta'
const STORE = 'autosave'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE, 2)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
      if (!request.result.objectStoreNames.contains('catalog')) {
        request.result.createObjectStore('catalog')
      }
      if (!request.result.objectStoreNames.contains('recent_files')) {
        request.result.createObjectStore('recent_files', { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains('workspace')) {
        request.result.createObjectStore('workspace')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}
