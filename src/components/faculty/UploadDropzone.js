'use client'

import { UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mov,.txt'

export function UploadDropzone({
  onFileSelect,
  disabled = false,
  label = 'Upload Resources',
  hint = 'Drag and drop files here, or click the button below to browse.',
  accept = DEFAULT_ACCEPT,
  multiple = true,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0 || disabled) {
      return
    }
    // Pass the entire fileList (as an array) if multiple is enabled
    onFileSelect?.(multiple ? Array.from(fileList) : [fileList[0]])
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center justify-center p-12 transition-all duration-300',
        'rounded-3xl border-2 border-dashed',
        isDragging
          ? 'border-primary bg-primary/5 scale-[0.99] shadow-inner'
          : 'border-border/40 bg-muted/5 hover:border-primary/30 hover:bg-muted/10',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer?.files)
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      aria-disabled={disabled}
      aria-label="Upload resource file"
    >
      <div className={cn(
        "mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
        isDragging ? "bg-primary text-white scale-110 rotate-3" : "bg-primary/10 text-primary group-hover:bg-primary/20"
      )}>
        <UploadCloud size={32} className={isDragging ? "animate-bounce" : ""} />
      </div>

      <div className="text-center space-y-1.5 mb-8 max-w-[280px]">
        <p className="text-base font-semibold text-foreground tracking-tight">{label}</p>
        <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed">{hint}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="rounded-xl px-10 h-11 border-border/40 font-semibold text-xs hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm active:scale-95"
      >
        Browse Files
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled}
      />
    </div>
  )
}
