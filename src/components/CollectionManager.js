'use client'

import { FolderKanban, Plus, Save, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function CollectionManager({ collections = [], onCreate, onToggleSave, onDelete, role = 'faculty' }) {
  return (
    <div className="space-y-4">
      {role !== 'student' ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Create a collection</p>
            <p className="text-xs text-muted-foreground mt-0.5">Group resources into structured learning paths for students.</p>
          </div>
          <Button type="button" onClick={onCreate} className="h-9 px-4 rounded-lg bg-primary text-white font-semibold text-xs transition-all hover:bg-primary/90">
            <Plus size={14} className="mr-2" />
            New Collection
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.length > 0 ? collections.map((collection) => (
          <Card key={collection.id} className="rounded-xl border border-outline shadow-sm bg-surface-card">
            <CardHeader className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base font-semibold text-foreground truncate">{collection.title}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-1">{collection.description || 'No description provided.'}</CardDescription>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FolderKanban size={16} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-medium border-border/40">{collection.totalResources || 0} resources</Badge>
                <Badge variant={collection.visibility === 'public' ? 'secondary' : 'outline'} className="text-[10px] font-medium uppercase tracking-tight">
                  {collection.visibility || 'private'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {onToggleSave ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => onToggleSave(collection)} className="h-8 rounded-lg text-[11px] font-semibold border-border/40">
                    <Save size={12} className="mr-1.5" />
                    {role === 'student' ? 'Follow' : 'Save'}
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(collection)} className="h-8 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 size={12} className="mr-1.5" />
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
