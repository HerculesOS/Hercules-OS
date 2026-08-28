'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type SearchableSelectOption = {
  value: string
  label: string
  detail?: string
  searchText?: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  inputClass: string
  placeholder: string
  emptyMessage?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
  maxResults?: number
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  inputClass,
  placeholder,
  emptyMessage = 'No matches found',
  disabled = false,
  allowClear = true,
  className = '',
  maxResults = 30,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    if (selectedOption) {
      setQuery(selectedOption.label)
    } else if (!open) {
      setQuery('')
    }
  }, [open, selectedOption])

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = term
      ? options.filter((option) =>
          `${option.label} ${option.detail || ''} ${option.searchText || ''}`
            .toLowerCase()
            .includes(term)
        )
      : options

    return filtered.slice(0, maxResults)
  }, [maxResults, options, query])

  const selectOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <div className="flex gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            if (value) onChange('')
            setQuery(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches[0]) {
              event.preventDefault()
              selectOption(matches[0].value)
            }
          }}
        />

        {allowClear && value && (
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400"
            onClick={clearSelection}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.length > 0 ? (
            matches.map((option) => (
              <button
                key={option.value}
                type="button"
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.value)}
              >
                <span className="font-medium text-slate-900">{option.label}</span>

                {option.detail && (
                  <span className="block text-xs text-slate-500">{option.detail}</span>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  )
}
