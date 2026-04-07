'use client'

import { AlertCircle, CheckCircle2, Download, LoaderCircle } from 'lucide-react'
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

export function StudentResourceCard({ entry, onDownload }) {
  const status = statusMap[entry.uploadStatus] || statusMap.completed
  const StatusIcon = status.icon
  const showProgress = entry.uploadStatus === 'uploading' || entry.uploadStatus === 'failed'

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{entry.subject}</Badge>
          <Badge variant="outline">{entry.class}</Badge>
        </div>
        <span className={cn('text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full', status.tone)}>
          <StatusIcon size={14} className={entry.uploadStatus === 'uploading' ? 'animate-spin' : ''} />
          {status.label}
        </span>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 pb-4">
        <CardTitle className="text-lg leading-tight line-clamp-2">{entry.title}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-3">{entry.summary}</p>
        {showProgress ? (
          <div className="mt-auto pt-3 flex items-center gap-3">
            <Progress value={entry.uploadProgress} aria-label={`${entry.title} upload progress`} className="flex-1 h-2" />
            <span className="text-xs font-medium text-muted-foreground w-10 text-right">{entry.uploadProgress}%</span>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-row items-center justify-between pt-0 pb-5">
        <span className="text-xs text-muted-foreground">{entry.updatedLabel}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onDownload(entry)}
          disabled={entry.uploadStatus === 'uploading'}
          aria-label={`Download ${entry.title}`}
        >
          <Download size={14} className="mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  )
}
