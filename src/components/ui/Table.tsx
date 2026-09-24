import React from 'react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  emptyIcon?: string
  loading?: boolean
  className?: string
}

export function Table<T extends { id: string }>({
  columns, data, emptyMessage = 'Aucune donnée.', emptyIcon = '📭', loading, className,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  return (
    <div className={cn('table-wrapper', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} className={col.className}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state py-12">
                  <div className="empty-state-icon">{emptyIcon}</div>
                  <p className="empty-state-title">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={row.id}>
                {columns.map(col => (
                  <td key={String(col.key)} className={col.className}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, totalItems)

  return (
    <div className="pagination">
      <span className="text-sm">{start}–{end} sur {totalItems}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="pagination-btn"
        >
          ‹
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = page - 2 + i
          if (p < 1) p = i + 1
          if (p > totalPages) p = totalPages - (4 - i)
          if (p < 1 || p > totalPages) return null
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn('pagination-btn', p === page && 'pagination-btn-active')}
            >
              {p}
            </button>
          )
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="pagination-btn"
        >
          ›
        </button>
      </div>
    </div>
  )
}
