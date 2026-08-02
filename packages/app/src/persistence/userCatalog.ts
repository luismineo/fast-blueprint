import {
  USER_CATALOG_KEY,
  parseUserCatalog,
  serializeUserCatalog,
  type CatalogItem,
} from '@planta/catalog'

/**
 * Adaptador de IndexedDB para o catálogo do usuário
 * (`06-catalogo-de-mobilia.md` § Catálogo do usuário).
 *
 * Só armazenamento: montar, validar e mesclar item vivem em `@planta/catalog`,
 * que roda em Node puro. É a divisão que a spec 08 § Pacotes desenha, e é o que
 * permite testar o catálogo sem browser.
 *
 * Sem IndexedDB — Node, teste, navegador com armazenamento bloqueado — as duas
 * funções viram no-op e o app segue com o catálogo default.
 */

const DATABASE = 'planta'
const STORE = 'catalog'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE, 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function loadUserCatalog(): Promise<CatalogItem[]> {
  const db = await openDatabase()
  if (!db) return []

  const raw = await new Promise<unknown>((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(USER_CATALOG_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(undefined)
  })

  try {
    return parseUserCatalog(raw)
  } catch {
    // Conteúdo corrompido não derruba o app: o default continua valendo. A
    // mensagem acionável para o usuário é assunto da spec 05, no M4.
    return []
  }
}

export async function saveUserCatalog(items: readonly CatalogItem[]): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(serializeUserCatalog(items), USER_CATALOG_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
}
