import { useMutation } from '@tanstack/react-query'
import { getApiHeaders } from '../lib/api'
import type { DocumentUploadResponse } from '../lib/types'

export const useDocumentUpload = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<DocumentUploadResponse> => {
      const formData = new FormData()
      formData.append('file', file)

      // Use fetch (not Axios) — browser auto-sets multipart boundary on FormData
      const res = await fetch('/api/v1/document/upload', {
        method: 'POST',
        headers: getApiHeaders(), // No Content-Type — let browser set it with boundary
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { detail?: string }).detail ?? `Upload failed: ${res.status}`
        )
      }

      return res.json() as Promise<DocumentUploadResponse>
    },
  })
}
