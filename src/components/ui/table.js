import { cn } from '@/lib/cn'

export function Table({ className = '', ...props }) {
  return (
    <div className={cn('ui-table-wrap', className)}>
      <table className="ui-table" {...props} />
    </div>
  )
}

export function TableHeader({ className = '', ...props }) {
  return <thead className={cn('ui-table__header', className)} {...props} />
}

export function TableBody({ className = '', ...props }) {
  return <tbody className={cn('ui-table__body', className)} {...props} />
}

export function TableRow({ className = '', ...props }) {
  return <tr className={cn('ui-table__row', className)} {...props} />
}

export function TableHead({ className = '', ...props }) {
  return <th className={cn('ui-table__head', className)} {...props} />
}

export function TableCell({ className = '', ...props }) {
  return <td className={cn('ui-table__cell', className)} {...props} />
}
