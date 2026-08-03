export async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  if (!db.objectStoreNames.contains(STORE)) {
    // Cannot create store without upgrade
    return
  }

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(handle, KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDatabase()
  if (!db) return null

  if (!db.objectStoreNames.contains(STORE)) return null

  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result)
      } else {
        resolve(null)
      }
    }
    request.onerror = () => resolve(null)
  })
}

const DATABASE = 'planta'
const STORE = 'workspace'
const KEY = 'current_file_handle'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    // Use version 2 so that it triggers upgradeneeded for new stores
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
      if (!request.result.objectStoreNames.contains('autosave')) {
        request.result.createObjectStore('autosave')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}
