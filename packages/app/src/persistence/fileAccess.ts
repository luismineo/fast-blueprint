export async function saveFile(
  content: string,
  handle?: FileSystemFileHandle,
  suggestedName: string = 'documento'
): Promise<FileSystemFileHandle | null> {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    let currentHandle = handle
    if (!currentHandle) {
      try {
        currentHandle = await (window as any).showSaveFilePicker({
          suggestedName: `${suggestedName}.planta.json`,
          types: [
            {
              description: 'Documentos JSON',
              accept: { 'application/json': ['.json', '.planta.json'] },
            },
          ],
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        throw err
      }
    }

    if (!currentHandle) return null

    const writable = await currentHandle.createWritable()
    await writable.write(content)
    await writable.close()

    return currentHandle
  }

  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${suggestedName}.planta.json`
  a.click()
  URL.revokeObjectURL(url)

  return null
}

export async function openFile(): Promise<{ handle?: FileSystemFileHandle; content: string } | null> {
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Documentos JSON',
            accept: { 'application/json': ['.json', '.planta.json'] },
          },
        ],
      })
      const file = await handle.getFile()
      const content = await file.text()
      return { handle, content }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      throw err
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.planta.json'
    input.onchange = async () => {
      if (input.files && input.files.length > 0) {
        const file = input.files[0]!
        const content = await file.text()
        resolve({ content })
      } else {
        resolve(null)
      }
    }
    input.click()
  })
}
