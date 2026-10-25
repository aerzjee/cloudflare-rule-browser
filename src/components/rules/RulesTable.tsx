import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Cpu,
  Filter,
  Globe,
  Laptop,
  Minus,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  X,
} from 'lucide-react'
import type { NormalizedAccessRule } from '../../types/cloudflare'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { GlassInput } from '../ui/GlassInput'
import { cn } from '../../lib/utils'

export interface RulesTableProps {
  data: NormalizedAccessRule[]
  isLoading?: boolean
  isFetching?: boolean
  onRefetch?: () => void
  onDeleteRule?: (rule: NormalizedAccessRule) => void
  onDeleteSelected?: (rules: NormalizedAccessRule[]) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  className?: string
}

// ─────────────────────────────────────────────────────────────
// Subcomponents: Checkbox & CopyButton
// ─────────────────────────────────────────────────────────────

interface GlassCheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  'aria-label'?: string
}

const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  'aria-label': ariaLabel,
}) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !checked && indeterminate
    }
  }, [checked, indeterminate])

  return (
    <label
      className={cn(
        'relative inline-flex items-center justify-center cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        className="sr-only peer"
      />
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
          'border backdrop-blur-md shadow-sm',
          checked
            ? 'bg-[#f6821f] border-orange-500 text-white shadow-orange-500/20'
            : indeterminate
            ? 'bg-[#f6821f]/90 border-orange-400 text-white'
            : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-white/20 hover:border-orange-400 text-transparent'
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
        {!checked && indeterminate && <Minus className="w-3 h-3 stroke-[3]" />}
      </div>
    </label>
  )
}

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Skopiowano!' : 'Kopiuj do schowka'}
      className={cn(
        'p-1 rounded-md transition-all duration-200 cursor-pointer',
        'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 active:scale-95',
        copied
          ? 'text-emerald-500 dark:text-emerald-400'
          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      )}
      aria-label="Kopiuj do schowka"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return dateStr
  }
}

function getTargetIcon(target: string) {
  const t = target.toLowerCase()
  if (t === 'ip') return <Laptop className="w-3.5 h-3.5" />
  if (t === 'ip_range') return <Network className="w-3.5 h-3.5" />
  if (t === 'asn') return <Server className="w-3.5 h-3.5" />
  if (t === 'country') return <Globe className="w-3.5 h-3.5" />
  return <Laptop className="w-3.5 h-3.5" />
}

function getModeBadge(mode: string) {
  const m = mode.toLowerCase()

  if (m === 'block') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm">
        <Ban className="w-3.5 h-3.5" />
        Block
      </span>
    )
  }

  if (m === 'whitelist') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
        <ShieldCheck className="w-3.5 h-3.5" />
        Whitelist
      </span>
    )
  }

  if (m === 'managed_challenge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
        <ShieldAlert className="w-3.5 h-3.5 text-[#f6821f]" />
        Managed Challenge
      </span>
    )
  }

  if (m === 'js_challenge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
        <Cpu className="w-3.5 h-3.5" />
        JS Challenge
      </span>
    )
  }

  if (m === 'challenge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-orange-500/15 text-[#f6821f] border border-orange-500/30 shadow-sm">
        <ShieldQuestion className="w-3.5 h-3.5" />
        Challenge
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-400/20 shadow-sm">
      {mode}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Main RulesTable Component
// ─────────────────────────────────────────────────────────────

export const RulesTable: React.FC<RulesTableProps> = ({
  data,
  isLoading = false,
  isFetching = false,
  onRefetch,
  onDeleteRule,
  onDeleteSelected,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: setControlledRowSelection,
  className,
}) => {
  // Local table state
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const setRowSelection = setControlledRowSelection ?? setInternalRowSelection

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_on', desc: true },
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'account' | 'zone'>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  // Columns definition
  const columns = useMemo<ColumnDef<NormalizedAccessRule>[]>(
    () => [
      // 1a. Checkbox zaznaczania
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <GlassCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label="Zaznacz wszystkie na stronie"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <GlassCheckbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`Zaznacz regułę ${row.original.id}`}
            />
          </div>
        ),
        enableSorting: false,
        size: 44,
      },

      // 1b. Zone / Scope
      {
        id: 'zone',
        accessorFn: (row) =>
          row.scopeType === 'account'
            ? `Account ${row.accountName || ''}`
            : `Zone ${row.zoneName || row.zoneId || ''}`,
        header: ({ column }) => {
          const isSorted = column.getIsSorted()
          return (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="group flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            >
              <span>Domena / Zakres</span>
              {isSorted === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const rule = row.original
          if (rule.scopeType === 'account') {
            return (
              <div className="flex items-center gap-2">
                <span
                  title={rule.rawScopeType ? `ACCOUNT (${rule.rawScopeType})` : 'ACCOUNT'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-sm shrink-0"
                >
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  ACCOUNT
                </span>
                <span
                  className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate"
                  title={rule.accountName}
                >
                  {rule.accountName || 'Całe konto'}
                </span>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-2">
              <span
                title="ZONE"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-sm shrink-0"
              >
                <Globe className="w-3 h-3 text-blue-500" />
                ZONE
              </span>
              <div className="flex flex-col min-w-0">
                <span
                  className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate"
                  title={rule.zoneName}
                >
                  {rule.zoneName || 'Strefa Cloudflare'}
                </span>
                {rule.zoneId && (
                  <span className="font-mono text-[10px] text-slate-400 truncate">
                    {rule.zoneId}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },

      // 1c. Target & Value
      {
        id: 'value',
        accessorFn: (row) => `${row.target} ${row.value}`,
        header: ({ column }) => {
          const isSorted = column.getIsSorted()
          return (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="group flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            >
              <span>Target / Wartość</span>
              {isSorted === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const { target, value } = row.original
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-white/10 shrink-0"
                title={`Target: ${target}`}
              >
                {getTargetIcon(target)}
                {target}
              </span>

              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 select-all truncate">
                {value}
              </span>

              <CopyButton value={value} />
            </div>
          )
        },
      },

      // 1d. Action / Mode
      {
        id: 'mode',
        accessorKey: 'mode',
        header: ({ column }) => {
          const isSorted = column.getIsSorted()
          return (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="group flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            >
              <span>Akcja / Tryb</span>
              {isSorted === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        },
        cell: ({ row }) => getModeBadge(row.original.mode),
      },

      // 1e. Notes
      {
        id: 'notes',
        accessorKey: 'notes',
        header: ({ column }) => {
          const isSorted = column.getIsSorted()
          return (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="group flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            >
              <span>Notatki</span>
              {isSorted === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const notes = row.original.notes
          if (!notes) {
            return <span className="text-xs text-slate-400 italic">Brak notatki</span>
          }
          return (
            <span
              className="text-xs text-slate-700 dark:text-slate-300 max-w-xs block truncate"
              title={notes}
            >
              {notes}
            </span>
          )
        },
      },

      // 1f. Created On
      {
        id: 'created_on',
        accessorKey: 'created_on',
        header: ({ column }) => {
          const isSorted = column.getIsSorted()
          return (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="group flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            >
              <span>Data utworzenia</span>
              {isSorted === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#f6821f]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatDate(row.original.created_on)}</span>
          </div>
        ),
      },

      // 1g. Actions
      {
        id: 'actions',
        header: () => <span className="sr-only">Akcje</span>,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onDeleteRule?.(rule)}
                title="Usuń regułę"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                aria-label="Usuń regułę"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        },
        enableSorting: false,
        size: 50,
      },
    ],
    [onDeleteRule]
  )

  // Filtered dataset for Mode and Scope filters
  const filteredData = useMemo(() => {
    return data.filter((rule) => {
      // Mode filter
      if (modeFilter !== 'all' && rule.mode.toLowerCase() !== modeFilter.toLowerCase()) {
        return false
      }
      // Scope filter
      if (scopeFilter === 'account' && rule.scopeType !== 'account') {
        return false
      }
      if (scopeFilter === 'zone' && rule.scopeType !== 'zone') {
        return false
      }
      return true
    })
  }, [data, modeFilter, scopeFilter])

  // Custom global search filter matching IP, target, domain/zone, or notes
  const globalFilterFn = (
    row: { original: NormalizedAccessRule },
    _columnId: string,
    filterValue: string
  ) => {
    const q = String(filterValue).toLowerCase().trim()
    if (!q) return true
    const rule = row.original
    const val = (rule.value || '').toLowerCase()
    const target = (rule.target || '').toLowerCase()
    const zone = (rule.zoneName || rule.zoneId || '').toLowerCase()
    const notes = (rule.notes || '').toLowerCase()
    const mode = (rule.mode || '').toLowerCase()
    return (
      val.includes(q) ||
      target.includes(q) ||
      zone.includes(q) ||
      notes.includes(q) ||
      mode.includes(q)
    )
  }

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      pagination,
    },
    // UWAGA: Konfiguracja getRowId zgodna ze specyfikacją Cloudflare scope
    getRowId: (row) =>
      row.scopeType === 'account'
        ? `account-${row.accountId}-${row.id}`
        : `zone-${row.zoneId}-${row.id}`,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
  })

  // Auto-animate na <tbody> dla płynnych przejść przy usuwaniu/filtrowaniu
  const [tableBodyRef, enableAnimations] = useAutoAnimate<HTMLTableSectionElement>({
    duration: 220,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  })

  // Optymalizacja wydajności przy dużej liczbie wierszy
  const renderedRowsCount = table.getRowModel().rows.length
  useEffect(() => {
    enableAnimations(renderedRowsCount <= 250)
  }, [renderedRowsCount, enableAnimations])

  // Selected rules for bulk action
  const selectedRowModel = table.getSelectedRowModel()
  const selectedCount = selectedRowModel.rows.length

  const handleDeleteSelected = () => {
    if (selectedCount === 0 || !onDeleteSelected) return
    const selectedRules = selectedRowModel.rows.map((r) => r.original)
    onDeleteSelected(selectedRules)
  }

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* 3. Szklany pasek narzędziowy nad tabelą */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Lewa strona: wyszukiwarka */}
          <div className="flex-1 max-w-md">
            <GlassInput
              placeholder="Szukaj po IP, domenie, notatce..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              rightIcon={
                globalFilter ? (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter('')}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Wyczyść wyszukiwanie"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Środek i Prawa strona: Filtry, Akcje masowe, Odświeżanie */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtr akcji (Mode) */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                aria-label="Filtruj wg trybu akcji"
                className={cn(
                  'h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
                  'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                  'border border-slate-200/90 dark:border-white/10',
                  'text-slate-800 dark:text-slate-200 shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]'
                )}
              >
                <option value="all">Wszystkie akcje</option>
                <option value="block">Block (Blokada)</option>
                <option value="whitelist">Whitelist (Biała lista)</option>
                <option value="managed_challenge">Managed Challenge</option>
                <option value="js_challenge">JS Challenge</option>
                <option value="challenge">Challenge</option>
              </select>
            </div>

            {/* Filtr zakresu (Scope) */}
            <select
              value={scopeFilter}
              onChange={(e) =>
                setScopeFilter(e.target.value as 'all' | 'account' | 'zone')
              }
              aria-label="Filtruj wg zakresu"
              className={cn(
                'h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
                'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                'border border-slate-200/90 dark:border-white/10',
                'text-slate-800 dark:text-slate-200 shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]'
              )}
            >
              <option value="all">Wszystkie zakresy</option>
              <option value="account">Tylko reguły konta</option>
              <option value="zone">Tylko reguły stref</option>
            </select>

            {/* Przycisk usuwania zaznaczonych */}
            {selectedCount > 0 && onDeleteSelected && (
              <GlassButton
                variant="danger"
                size="md"
                onClick={handleDeleteSelected}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Usuń zaznaczone ({selectedCount})
              </GlassButton>
            )}

            {/* Przycisk odświeżania */}
            {onRefetch && (
              <GlassButton
                variant="glass"
                size="md"
                onClick={onRefetch}
                disabled={isFetching}
                leftIcon={
                  <RefreshCw
                    className={cn('w-4 h-4', isFetching && 'animate-spin text-[#f6821f]')}
                  />
                }
              >
                Odśwież
              </GlassButton>
            )}
          </div>
        </div>

        {/* Wskaźnik liczby reguł i aktywnego zaznaczenia */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Znaleziono:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {table.getFilteredRowModel().rows.length}
              </strong>{' '}
              reguł
              {data.length !== table.getFilteredRowModel().rows.length && (
                <span> (z łącznie {data.length})</span>
              )}
            </span>

            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-[#f6821f] font-semibold">
                Zaznaczono {selectedCount}
              </span>
            )}
          </div>

          {/* Szybki reset filtrów */}
          {(globalFilter || modeFilter !== 'all' || scopeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setGlobalFilter('')
                setModeFilter('all')
                setScopeFilter('all')
              }}
              className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer font-medium"
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      </GlassCard>

      {/* Tabela w stylistyce Glassmorphism */}
      <GlassCard className="p-0 overflow-hidden border border-white/50 dark:border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Nagłówek tabeli */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200/80 dark:border-white/10 backdrop-blur-md bg-slate-100/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className="px-4 py-3.5 first:pl-5 last:pr-5 select-none"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Ciało tabeli z płynną animacją useAutoAnimate */}
            <tbody
              ref={tableBodyRef}
              className="divide-y divide-slate-200/60 dark:divide-white/5 text-sm"
            >
              {isLoading ? (
                // Stan ładowania
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td colSpan={columns.length} className="px-5 py-4">
                      <div className="h-5 bg-slate-200/70 dark:bg-slate-800/70 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                // Stan pusty
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-400">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
                        Brak pasujących reguł
                      </p>
                      <p className="text-xs max-w-sm">
                        Nie znaleziono żadnych reguł Cloudflare spełniających zadane kryteria
                        wyszukiwania lub konto nie posiada skonfigurowanych reguł dostępu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Wiersze z danymi
                table.getRowModel().rows.map((row) => {
                  const isSelected = row.getIsSelected()
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors duration-150',
                        'hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.06]',
                        isSelected &&
                          'bg-orange-500/[0.08] dark:bg-orange-500/[0.12] border-l-2 border-l-[#f6821f]'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3.5 first:pl-5 last:pr-5 align-middle"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacja */}
        {table.getFilteredRowModel().rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 backdrop-blur-md bg-white/40 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-400">
            {/* Wybór liczby wierszy na stronę */}
            <div className="flex items-center gap-2">
              <span>Wierszy na stronę:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs font-medium cursor-pointer',
                  'backdrop-blur-md bg-white/70 dark:bg-slate-900/70',
                  'border border-slate-300/80 dark:border-white/10 text-slate-800 dark:text-slate-200'
                )}
              >
                {[10, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>

              <span className="hidden sm:inline">
                Strona{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {table.getState().pagination.pageIndex + 1}
                </strong>{' '}
                z{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {table.getPageCount()}
                </strong>
              </span>
            </div>

            {/* Przyciski paginacji */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title="Pierwsza strona"
                aria-label="Pierwsza strona"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title="Poprzednia strona"
                aria-label="Poprzednia strona"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="sm:hidden px-2 font-medium">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title="Następna strona"
                aria-label="Następna strona"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title="Ostatnia strona"
                aria-label="Ostatnia strona"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

export default RulesTable
