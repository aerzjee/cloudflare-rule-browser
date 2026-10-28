import React, { useMemo, useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Globe,
  Laptop,
  Minus,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  X,
} from 'lucide-react'
import type { NormalizedAccessRule } from '../../types/cloudflare'
import { useTranslation } from '../../i18n/useTranslation'
import { useHighlightStore } from '../../store/useHighlightStore'
import { useTrashStore } from '../../store/useTrashStore'
import { exportRulesToCsv, exportRulesToJson } from '../../utils/exportRules'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { GlassInput } from '../ui/GlassInput'
import { InlineModeDropdown } from './InlineModeDropdown'
import { InlineNoteEditor } from './InlineNoteEditor'
import { AddRuleModal } from './AddRuleModal'
import { TrashModal } from './TrashModal'
import { isIpAddress, isIpInCidr } from '../../utils/cidrMatcher'
import { cn } from '../../lib/utils'

export interface RulesTableProps {
  data: NormalizedAccessRule[]
  isLoading?: boolean
  isFetching?: boolean
  onRefetch?: () => void
  onDeleteRule?: (rule: NormalizedAccessRule) => void
  onDeleteSelected?: (rules: NormalizedAccessRule[]) => void
  onAddRule?: () => void
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
        'relative inline-flex items-center justify-center cursor-pointer select-none w-4 h-4 shrink-0',
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

const CopyButton: React.FC<{ value: string; copyLabel?: string; copiedLabel?: string }> = ({
  value,
  copyLabel = 'Copy to clipboard',
  copiedLabel = 'Copied!',
}) => {
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
      title={copied ? copiedLabel : copyLabel}
      className={cn(
        'p-1 rounded-md transition-all duration-200 cursor-pointer',
        'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 active:scale-95',
        copied
          ? 'text-emerald-500 dark:text-emerald-400'
          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      )}
      aria-label={copyLabel}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function formatDate(dateStr?: string, language: string = 'en'): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
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
  onAddRule,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: setControlledRowSelection,
  className,
}) => {
  "use no memo";

  const { t, language } = useTranslation()
  const newlySyncedRuleKeys = useHighlightStore((s) => s.newlySyncedRuleKeys)
  const removingRuleKeys = useHighlightStore((s) => s.removingRuleKeys)

  // Add rule modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const handleOpenAddModal = onAddRule ?? (() => setIsAddModalOpen(true))

  // Trash modal state & count
  const trashRules = useTrashStore((s) => s.trashRules)
  const trashCount = trashRules.length
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)

  // Export menu dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close export dropdown on click outside or Escape
  useEffect(() => {
    if (!isExportMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setIsExportMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExportMenuOpen])

  // Local table state
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const setRowSelection = setControlledRowSelection ?? setInternalRowSelection

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_on', desc: true },
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const trimmedFilter = globalFilter.trim()
  const isSearchIp = useMemo(() => isIpAddress(trimmedFilter), [trimmedFilter])
  const [modeFilter, setModeFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'account' | 'zone'>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  // Synchronize and clean up rowSelection if selected rules were deleted or reconciled out
  useEffect(() => {
    if (!rowSelection || Object.keys(rowSelection).length === 0) return

    const currentKeySet = new Set(
      data.map((r) =>
        r.scopeType === 'account'
          ? `account-${r.accountId}-${r.id}`
          : `zone-${r.zoneId}-${r.id}`
      )
    )

    let hasStale = false
    const cleanedSelection: RowSelectionState = {}

    for (const [key, isSelected] of Object.entries(rowSelection)) {
      if (isSelected) {
        if (currentKeySet.has(key)) {
          cleanedSelection[key] = true
        } else {
          hasStale = true
        }
      }
    }

    if (hasStale) {
      setRowSelection(cleanedSelection)
    }
  }, [data, rowSelection, setRowSelection])

  // Columns definition
  const columns = useMemo<ColumnDef<NormalizedAccessRule>[]>(
    () => [
      // 1a. Selection checkbox
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <GlassCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label={language === 'pl' ? 'Zaznacz wszystkie na stronie' : 'Select all on page'}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <GlassCheckbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={language === 'pl' ? `Zaznacz regułę ${row.original.id}` : `Select rule ${row.original.id}`}
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
              <span>{t.table.colScope}</span>
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
                  {rule.accountName || t.table.entireAccount}
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
                  {rule.zoneName || t.table.cloudflareZone}
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
              <span>{t.table.colTargetValue}</span>
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

          // Check if this row was matched via CIDR subnet containment
          const isCidrMatch =
            Boolean(trimmedFilter) &&
            isSearchIp &&
            target === 'ip_range' &&
            !value.toLowerCase().includes(trimmedFilter.toLowerCase()) &&
            isIpInCidr(trimmedFilter, value)

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

              {isCidrMatch && (
                <span
                  title={t.table.cidrMatchTooltip}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0"
                >
                  <Network className="w-3 h-3 text-cyan-500" />
                  {t.table.cidrMatch}
                </span>
              )}

              <CopyButton
                value={value}
                copyLabel={t.table.copyValue}
                copiedLabel={t.common.copied}
              />
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
              <span>{t.table.colMode}</span>
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
        cell: ({ row }) => <InlineModeDropdown rule={row.original} />,
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
              <span>{t.table.colNotes}</span>
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
        cell: ({ row }) => <InlineNoteEditor rule={row.original} />,
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
              <span>{t.table.colCreated}</span>
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
            <span>{formatDate(row.original.created_on, language)}</span>
          </div>
        ),
      },

      // 1g. Actions
      {
        id: 'actions',
        header: () => <span className="sr-only">{t.table.colActions}</span>,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onDeleteRule?.(rule)}
                title={t.table.deleteRule}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                aria-label={t.table.deleteRule}
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
    [onDeleteRule, language, t, trimmedFilter, isSearchIp]
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

  // Custom global search filter matching IP, target, domain/zone, notes, or CIDR subnet containment
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

    // 1. Literal text search
    if (
      val.includes(q) ||
      target.includes(q) ||
      zone.includes(q) ||
      notes.includes(q) ||
      mode.includes(q)
    ) {
      return true
    }

    // 2. Intelligent CIDR subnet containment search
    if (isSearchIp && rule.target === 'ip_range') {
      return isIpInCidr(trimmedFilter, rule.value)
    }

    return false
  }

  // TanStack Table Instance
  // oxlint-disable-next-line react/incompatible-library, react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      pagination,
    },
    // NOTE: getRowId configuration consistent with Cloudflare scope model
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

  // Auto-animate on <tbody> for smooth row transitions during delete/filter
  const [tableBodyRef, enableAnimations] = useAutoAnimate<HTMLTableSectionElement>({
    duration: 220,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  })

  // Performance optimization for large datasets, while guaranteeing animations stay active during exit transitions
  const renderedRowsCount = table.getRowModel().rows.length
  const hasActiveAnimations =
    Object.keys(removingRuleKeys).length > 0 ||
    Object.keys(newlySyncedRuleKeys).length > 0

  useEffect(() => {
    if (hasActiveAnimations) {
      enableAnimations(true)
    } else {
      enableAnimations(renderedRowsCount <= 300)
    }
  }, [hasActiveAnimations, renderedRowsCount, enableAnimations])

  // Selected rules for bulk action
  const selectedRowModel = table.getSelectedRowModel()
  const selectedCount = selectedRowModel.rows.length

  const handleDeleteSelected = () => {
    if (selectedCount === 0 || !onDeleteSelected) return
    const selectedRules = selectedRowModel.rows.map((r) => r.original)
    onDeleteSelected(selectedRules)
  }

  // Rules to export (either selected rules or all currently filtered rules)
  const rulesToExport = useMemo(() => {
    if (selectedCount > 0) {
      return selectedRowModel.rows.map((r) => r.original)
    }
    return table.getFilteredRowModel().rows.map((r) => r.original)
  }, [selectedCount, selectedRowModel.rows, table])

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* 3. Glass toolbar above rules table */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-h-[52px]">
          {/* Left side: Search input */}
          <div className="flex-1 max-w-md">
            <GlassInput
              placeholder={t.table.searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              rightIcon={
                globalFilter ? (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter('')}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={t.table.clearSearch}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Middle and Right side: Filters, Bulk actions, Refresh */}
          <div className="flex flex-wrap items-center gap-3 min-h-[40px]">
            {/* Action mode filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                aria-label={t.table.filterModeAria}
                className={cn(
                  'h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
                  'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                  'border border-slate-200/90 dark:border-white/10',
                  'text-slate-800 dark:text-slate-200 shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]'
                )}
              >
                <option value="all">{t.table.allModes}</option>
                <option value="block">Block ({t.modeDropdown.modes.block.label})</option>
                <option value="whitelist">Whitelist ({t.modeDropdown.modes.whitelist.label})</option>
                <option value="managed_challenge">Managed Challenge ({t.modeDropdown.modes.managed_challenge.label})</option>
                <option value="js_challenge">JS Challenge ({t.modeDropdown.modes.js_challenge.label})</option>
                <option value="challenge">Challenge ({t.modeDropdown.modes.challenge.label})</option>
              </select>
            </div>

            {/* Scope filter */}
            <select
              value={scopeFilter}
              onChange={(e) =>
                setScopeFilter(e.target.value as 'all' | 'account' | 'zone')
              }
              aria-label={t.table.filterScopeAria}
              className={cn(
                'h-10 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
                'backdrop-blur-md bg-white/70 dark:bg-slate-900/60',
                'border border-slate-200/90 dark:border-white/10',
                'text-slate-800 dark:text-slate-200 shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-[#f6821f]/40 focus:border-[#f6821f]'
              )}
            >
              <option value="all">{t.table.allScopes}</option>
              <option value="account">{t.table.accountOnly}</option>
              <option value="zone">{t.table.zoneOnly}</option>
            </select>

            {/* Bulk delete button */}
            {selectedCount > 0 && onDeleteSelected && (
              <GlassButton
                variant="danger"
                size="md"
                onClick={handleDeleteSelected}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                {t.table.deleteSelected(selectedCount)}
              </GlassButton>
            )}

            {/* Refresh button */}
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
                {t.common.refresh}
              </GlassButton>
            )}

            {/* Add Rule button */}
            <GlassButton
              variant="primary"
              size="md"
              onClick={handleOpenAddModal}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t.table.addRule}
            </GlassButton>

            {/* Export Dropdown Button */}
            <div className="relative" ref={exportMenuRef}>
              <GlassButton
                variant="glass"
                size="md"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                leftIcon={<Download className="w-4 h-4 text-blue-500" />}
                rightIcon={
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isExportMenuOpen && 'rotate-180'
                    )}
                  />
                }
              >
                <span>
                  {selectedCount > 0
                    ? t.table.exportSelected(selectedCount)
                    : t.table.export}
                </span>
              </GlassButton>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    role="menu"
                    aria-label={t.table.export}
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full mt-2 right-0 sm:left-0 sm:right-auto z-40 min-w-[170px] p-1.5 rounded-2xl backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-white/15 shadow-2xl shadow-black/20 flex flex-col space-y-1"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsExportMenuOpen(false)
                        exportRulesToCsv(rulesToExport)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{t.table.exportCsv}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsExportMenuOpen(false)
                        exportRulesToJson(rulesToExport)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                    >
                      <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{t.table.exportJson}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Trash / Recently Deleted Button */}
            <GlassButton
              variant="glass"
              size="md"
              onClick={() => setIsTrashModalOpen(true)}
              title={t.table.trashTooltip(trashCount)}
              leftIcon={<ArchiveRestore className="w-4 h-4 text-orange-500" />}
            >
              <span>{t.table.trash}</span>
              {trashCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-500/20 text-[#f6821f] border border-orange-500/30">
                  {trashCount}
                </span>
              )}
            </GlassButton>
          </div>
        </div>

        {/* Rules counter and active selection badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 min-h-[38px]">
          <div className="flex items-center gap-3 min-h-[26px]">
            <span>
              {t.table.foundRules(table.getFilteredRowModel().rows.length, data.length)}
            </span>

            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-[#f6821f] font-semibold">
                {t.table.selectedCount(selectedCount)}
              </span>
            )}
          </div>

          {/* Fast filter reset */}
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
              {t.table.clearFilters}
            </button>
          )}
        </div>
      </GlassCard>

      {/* Glassmorphism table container */}
      <GlassCard className="p-0 overflow-hidden border border-white/50 dark:border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table header */}
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

            {/* Animated table body */}
            <tbody
              ref={tableBodyRef}
              className="divide-y divide-slate-200/60 dark:divide-white/5 text-sm"
            >
              {isLoading ? (
                // Loading skeleton state
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td colSpan={columns.length} className="px-5 py-4">
                      <div className="h-5 bg-slate-200/70 dark:bg-slate-800/70 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                // Empty state
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
                        {t.table.emptyTitle}
                      </p>
                      <p className="text-xs max-w-sm">
                        {t.table.emptyDesc}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                table.getRowModel().rows.map((row) => {
                  const isSelected = row.getIsSelected()
                  const isNew = Boolean(newlySyncedRuleKeys[row.id])
                  const isRemoving = Boolean(removingRuleKeys[row.id])
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors duration-150',
                        'hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.06]',
                        isSelected
                          ? 'bg-orange-500/[0.08] dark:bg-orange-500/[0.12] shadow-[inset_2px_0_0_0_#f6821f]'
                          : 'shadow-none',
                        isNew && 'animate-rule-blink shadow-[inset_3px_0_0_0_#10b981]',
                        isRemoving && 'animate-rule-remove shadow-[inset_3px_0_0_0_#f43f5e]'
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

        {/* Pagination */}
        {table.getFilteredRowModel().rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 backdrop-blur-md bg-white/40 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-400">
            {/* Page size selection */}
            <div className="flex items-center gap-2">
              <span>{t.table.rowsPerPage}</span>
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
                {t.table.page}{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {table.getState().pagination.pageIndex + 1}
                </strong>{' '}
                {t.table.of}{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {table.getPageCount()}
                </strong>
              </span>
            </div>

            {/* Pagination control buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title={t.table.firstPage}
                aria-label={t.table.firstPage}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title={t.table.prevPage}
                aria-label={t.table.prevPage}
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
                title={t.table.nextPage}
                aria-label={t.table.nextPage}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                title={t.table.lastPage}
                aria-label={t.table.lastPage}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Add IP Access Rule Modal */}
      <AddRuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        rules={data}
      />

      {/* Trash / Recently Deleted Modal */}
      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
      />
    </div>
  )
}

export default RulesTable
