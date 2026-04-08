'use client'

import { ExternalLink, FileText, Download, ShieldAlert } from 'lucide-react'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDisplayDate } from '@/lib/demo-content'

function inferPreviewKind(resource) {
  const fileType = String(resource?.fileType || resource?.type || '').toLowerCase()
  const fileFormat = String(resource?.fileFormat || '').toLowerCase()
  const fileUrl = String(resource?.fileUrl || '').toLowerCase()

  if (fileType.includes('pdf') || fileFormat === 'pdf' || fileUrl.endsWith('.pdf')) {
    return 'pdf'
  }

  if (fileType.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(fileFormat)) {
    return 'text'
  }

  return 'other'
}

export function ResourceViewer({ open, onOpenChange, resource, role = 'student' }) {
  const previewKind = inferPreviewKind(resource)
  const previewUrl = resource?.id ? `/api/student/resources/${resource.id}/preview` : ''
  const downloadUrl = resource?.id ? `/api/student/resources/${resource.id}/download` : ''
  const canDownload = role !== 'student' && Boolean(downloadUrl)

  const openResource = (url) => {
    if (!url || typeof window === 'undefined') {
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="student-resource-viewer" labelledBy="resource-viewer-title">
      <DialogHeader>
        <DialogTitle id="resource-viewer-title">{resource?.title || 'Resource preview'}</DialogTitle>
        <DialogDescription>
          View the resource inside the app. Students stay in preview mode unless they choose to download.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{resource?.subject || 'General'}</Badge>
          <Badge variant="outline">{resource?.class || 'Unassigned class'}</Badge>
          <Badge variant={previewKind === 'other' ? 'outline' : 'secondary'}>
            {previewKind === 'pdf' ? 'PDF Preview' : previewKind === 'text' ? 'Text Preview' : 'Limited Preview'}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm text-muted">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Author</p>
            <p className="text-sm font-medium text-foreground">{resource?.facultyName || resource?.facultyEmail || 'Faculty member'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Updated</p>
            <p className="text-sm font-medium text-foreground">{formatDisplayDate(resource?.updatedAt || resource?.createdAt, 'N/A')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">File type</p>
            <p className="text-sm font-medium text-foreground uppercase">{resource?.fileFormat || resource?.fileType || 'Unknown'}</p>
          </div>
        </div>

        <Card className="overflow-hidden border border-outline bg-surface-panel">
          <CardContent className="p-0">
            {previewKind === 'pdf' ? (
              <iframe
                title={`${resource?.title || 'Resource'} preview`}
                src={previewUrl}
                className="h-[65vh] w-full bg-background"
              />
            ) : previewKind === 'text' ? (
              <iframe
                title={`${resource?.title || 'Resource'} text preview`}
                src={previewUrl}
                className="h-[65vh] w-full bg-background"
              />
            ) : (
              <div className="flex h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
                <ShieldAlert size={28} className="text-warning" />
                <h3 className="text-lg font-semibold text-foreground">Preview not available</h3>
                <p className="max-w-md text-sm text-muted">
                  This file type cannot be previewed inline. Use download access if your role permits it.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogBody>

      <DialogFooter className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Preview is served securely through the app.</p>
        <div className="flex items-center gap-2">
          {canDownload ? (
            <Button type="button" variant="outline" onClick={() => openResource(downloadUrl)}>
              <Download size={14} />
              Download
            </Button>
          ) : null}
          {role !== 'student' ? (
            <Button type="button" variant="secondary" className="h-9 rounded-lg px-4 text-xs font-semibold" onClick={() => openResource(resource?.fileUrl || previewUrl)}>
              <ExternalLink size={14} className="mr-2" />
              Open Source
            </Button>
          ) : null}
        </div>
      </DialogFooter>
    </Dialog>
  )
}

export function PreviewResourceButton({ children, onClick, ...props }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} {...props}>
      <FileText size={14} />
      {children || 'Preview'}
    </Button>
  )
}
