'use client'

import { memo } from 'react'
import { AlertCircle, Bookmark, CheckCircle2, Download, Eye, LoaderCircle, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'
import { ResourceCard } from '@/components/layout/StandardCards'

const statusMap = {
  uploading: {
    label: 'Processing',
    icon: LoaderCircle,
    variant: 'info'
  },
  completed: {
    label: 'Ready',
    icon: CheckCircle2,
    variant: 'success'
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    variant: 'error'
  },
}

export const StudentResourceCard = memo(function StudentResourceCard({
  resource,
  onPreview,
  onReview,
  onDownload,
  onBookmark,
  bookmarked = false,
  allowDownload = true,
}) {
  if (!resource) return null

  const status = statusMap[resource.uploadStatus] || statusMap.completed
  const showProgress = resource.uploadStatus === 'uploading' || resource.uploadStatus === 'failed'

  return (
    <ResourceCard
      title={resource.title}
      subtitle={resource.summary}
      icon={resource.icon || Clock}
      status={{
        label: status.label,
        variant: status.variant
      }}
      metadata={{
        'Subject': resource.subject,
        'Class': resource.class,
        'Updated': resource.updatedLabel || 'Just now',
        'Faculty': resource.facultyName || 'Staff'
      }}
      actions={
        <div className="flex w-full flex-wrap gap-2 py-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 min-w-[90px] h-9 gap-2 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => onPreview?.(resource)}
          >
            <Eye size={16} />
            Preview
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="flex-1 min-w-[90px] h-9 gap-2 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => onReview?.(resource)}
          >
            <MessageSquare size={16} />
            Review
          </Button>

          <Button
            size="sm"
            variant={bookmarked ? 'secondary' : 'ghost'}
            className={cn(
              "flex-1 min-w-[90px] h-9 gap-2 rounded-lg text-xs font-semibold transition-all",
              bookmarked ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "hover:bg-amber-500/10 hover:text-amber-600"
            )}
            onClick={() => onBookmark?.(resource)}
          >
            <Bookmark size={16} className={bookmarked ? 'fill-current' : ''} />
            {bookmarked ? 'Saved' : 'Save'}
          </Button>

          {allowDownload && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 min-w-[90px] h-9 gap-2 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
              onClick={() => onDownload?.(resource)}
              disabled={resource.uploadStatus === 'uploading'}
            >
              <Download size={15} />
              Download
            </Button>
          )}

          {showProgress && (
            <div className="w-full mt-3 p-3 rounded-xl bg-muted/30 border border-border/20">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/70">
                  {resource.uploadStatus === 'uploading' ? 'Processing...' : 'Issue Detected'}
                </span>
                <span className="text-[10px] font-bold text-foreground">{resource.uploadProgress}%</span>
              </div>
              <Progress value={resource.uploadProgress} className="h-1.5" />
            </div>
          )}
        </div>
      }
    />
  )
}, (prevProps, nextProps) => {
  const prevResource = prevProps.resource || {}
  const nextResource = nextProps.resource || {}

  return (
    prevResource.id === nextResource.id &&
    prevResource.uploadStatus === nextResource.uploadStatus &&
    prevResource.uploadProgress === nextResource.uploadProgress &&
    prevResource.updatedAt === nextResource.updatedAt &&
    prevProps.bookmarked === nextProps.bookmarked &&
    prevProps.allowDownload === nextProps.allowDownload
  )
})
