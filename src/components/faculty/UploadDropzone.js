'use client'

import { UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mov,.txt'

export function UploadDropzone({
  onFileSelect,
  disabled = false,
  label = 'Drop files here or browse',
  hint = 'Accepted: PDF, DOCX, PPTX, XLSX, ZIP, MP4, MOV, TXT',
  accept = DEFAULT_ACCEPT,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    const file = fileList?.[0]
    if (!file || disabled) {
      return
    }
    onFileSelect?.(file)
  }

  return (
    <div
      className={cn('upload-dropzone', isDragging && 'upload-dropzone--active', disabled && 'upload-dropzone--disabled')}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) {
          setIsDragging(true)
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer?.files)
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (disabled) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      aria-disabled={disabled}
      aria-label="Upload resource file"
    >
      <UploadCloud size={18} />
      <div>
        <p>{label}</p>
        <span>{hint}</span>
      </div>
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="upload-dropzone__input"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled}
      />
    </div>
  )
}
