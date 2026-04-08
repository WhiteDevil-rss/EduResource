'use client'

import { FolderKanban, Plus, Save, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function CollectionManager({ collections = [], onCreate, onToggleSave, onDelete, role = 'faculty' }) {
  return (
    <div className="space-y-4">
      {role !== 'student' ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-outline/50 bg-surface-panel/50 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Create a collection</p>
            <p className="text-sm text-muted">Group resources into ordered learning paths.</p>
          </div>
          <Button type="button" onClick={onCreate}>
            <Plus size={14} />
            New Collection
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.length > 0 ? collections.map((collection) => (
          <Card key={collection.id} className="rounded-xl border border-outline shadow-sm bg-surface-card">
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{collection.title}</CardTitle>
                  <CardDescription>{collection.description || 'No description provided.'}</CardDescription>
                </div>
                <FolderKanban size={18} className="text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{collection.totalResources || 0} resources</Badge>
                <Badge variant={collection.visibility === 'public' ? 'secondary' : 'outline'}>{collection.visibility || 'private'}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {onToggleSave ? (
                  <Button type="button" variant="outline" onClick={() => onToggleSave(collection)}>
                    <Save size={14} />
                    Save
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button type="button" variant="ghost" onClick={() => onDelete(collection)}>
                    <Trash2 size={14} />
                    Delete
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="rounded-xl border border-outline shadow-sm bg-surface-card md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted">No collections yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
