'use client'

import { memo } from 'react'
import { AlertCircle, Bookmark, CheckCircle2, Download, Eye, LoaderCircle, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'

const statusMap = {
  uploading: { label: 'Uploading', icon: LoaderCircle, tone: 'student-status--uploading' },
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'student-status--completed' },
  failed: { label: 'Failed', icon: AlertCircle, tone: 'student-status--failed' },
}

export const StudentResourceCard = memo(function StudentResourceCard({
  entry: legacyEntry,
  resource,
  onPreview,
  onReview,
  onDownload,
  onToggleBookmark,
  onBookmark,
  bookmarked = false,
  bookmarkDisabled = false,
  allowDownload = true,
}) {
  const entry = legacyEntry || resource
  if (!entry) {
    return null
  }

  const status = statusMap[entry.uploadStatus] || statusMap.completed
  const StatusIcon = status.icon
  const showProgress = entry.uploadStatus === 'uploading' || entry.uploadStatus === 'failed'

  return (
    <Card className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
      <CardHeader className="space-y-3 p-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{entry.subject}</Badge>
          <Badge variant="outline">{entry.class}</Badge>
        </div>
        <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium', status.tone)}>
          <StatusIcon size={14} className={entry.uploadStatus === 'uploading' ? 'animate-spin' : ''} />
          {status.label}
        </span>
      </CardHeader>

      <CardContent className="space-y-3 p-0">
        <CardTitle className="text-lg font-semibold text-foreground">{entry.title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{entry.summary}</p>
        {showProgress ? (
          <div className="flex items-center gap-3">
            <Progress value={entry.uploadProgress} aria-label={`${entry.title} upload progress`} />
            <span className="text-xs font-medium text-muted-foreground">{entry.uploadProgress}%</span>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 border-t border-border p-0 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">{entry.updatedLabel}</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl"
            onClick={() => onPreview?.(entry)}
            aria-label={`Preview ${entry.title}`}
          >
            <Eye size={14} />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => onReview?.(entry)}
            aria-label={`Review ${entry.title}`}
          >
            <MessageSquare size={14} />
            Review
          </Button>
          <Button
            type="button"
            variant={bookmarked ? 'default' : 'outline'}
            className="h-10 rounded-xl"
            onClick={() => (onToggleBookmark || onBookmark)?.(entry)}
            disabled={bookmarkDisabled}
            aria-label={`${bookmarked ? 'Remove bookmark for' : 'Save'} ${entry.title}`}
          >
            <Bookmark size={14} className={bookmarked ? 'fill-current' : ''} />
            {bookmarked ? 'Saved' : 'Save'}
          </Button>
          {allowDownload ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onDownload?.(entry)}
              disabled={entry.uploadStatus === 'uploading'}
              aria-label={`Download ${entry.title}`}
            >
              <Download size={14} />
              Download
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  )
})
