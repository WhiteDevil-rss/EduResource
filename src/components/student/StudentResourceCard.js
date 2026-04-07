'use client'

import { AlertCircle, CheckCircle2, Download, LoaderCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
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
    <Card className="student-resource-card">
      <CardContent className="student-resource-card__content">
        <div className="student-resource-card__main">
          <div className="student-resource-card__header">
            <div className="student-resource-card__meta">
              <Badge>{entry.subject}</Badge>
              <Badge variant="outline">{entry.class}</Badge>
            </div>
            <span className={cn('student-status', status.tone)}>
              <StatusIcon size={14} className={entry.uploadStatus === 'uploading' ? 'spin' : ''} />
              {status.label}
            </span>
          </div>

          <CardTitle className="student-resource-card__title">{entry.title}</CardTitle>
          <p className="student-resource-card__summary">{entry.summary}</p>
          {showProgress ? (
            <div className="student-resource-card__progress">
              <Progress value={entry.uploadProgress} aria-label={`${entry.title} upload progress`} />
              <span>{entry.uploadProgress}%</span>
            </div>
          ) : null}
          <span className="student-resource-card__updated">{entry.updatedLabel}</span>
        </div>

        <div className="student-resource-card__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onDownload(entry)}
            disabled={entry.uploadStatus === 'uploading'}
            aria-label={`Download ${entry.title}`}
          >
            <Download size={14} />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
