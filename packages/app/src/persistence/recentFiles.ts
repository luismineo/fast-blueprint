export interface RecentFile {
  id: string
  name: string
  lastOpenedAt: string
  handle?: FileSystemFileHandle
  path?: string
  thumbnailPng?: Blob
}

const DATABASE = 'planta'
const STORE = 'recent_files'
const MAX_RECENT_FILES = 8

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE, 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      // If other stores are needed, they will be created by their respective modules
      // during their own upgrade needed events (or they share the same version).
      // Wait, IndexedDB schema version must be global across the DB.
      // If autosave or fileHandleStore upgrades to 1, this upgrade needed is shared.
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function loadRecentFiles(): Promise<RecentFile[]> {
  const db = await openDatabase()
  if (!db) return []

  if (!db.objectStoreNames.contains(STORE)) return []

  return new Promise<RecentFile[]>((resolve) => {
    const transaction = db.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).getAll()
    request.onsuccess = () => {
      const files = (request.result as RecentFile[]).sort(
        (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
      )
      resolve(files.slice(0, MAX_RECENT_FILES))
    }
    request.onerror = () => resolve([])
  })
}

export async function addRecentFile(file: Omit<RecentFile, 'id'> & { id?: string }): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  if (!db.objectStoreNames.contains(STORE)) return

  const newFile: RecentFile = {
    ...file,
    id: file.id ?? crypto.randomUUID(),
  }

  const existingFiles = await loadRecentFiles()
  
  // If we're updating an existing file (e.g. by handle), we should try to match it.
  // We can match by handle if available.
  let targetId = newFile.id
  if (file.handle) {
    for (const ex of existingFiles) {
      if (ex.handle && (await ex.handle.isSameEntry(file.handle))) {
        targetId = ex.id
        break
      }
    }
  }

  newFile.id = targetId

  // Save the file
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(newFile)
    
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })

  // Enforce MAX_RECENT_FILES
  const updatedFiles = await loadRecentFiles()
  if (updatedFiles.length > MAX_RECENT_FILES) {
    const toDelete = updatedFiles.slice(MAX_RECENT_FILES)
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      toDelete.forEach((f) => store.delete(f.id))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
  }
}
