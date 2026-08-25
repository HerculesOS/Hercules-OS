'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ClientPickerProps = {
  clients: any[]
  value: string
  onChange: (clientId: string) => void
  inputClass: string
  placeholder?: string
  disabled?: boolean
}

const getClientLabel = (client: any) =>
  [client?.company, client?.name].filter(Boolean).join(' - ') || 'Unnamed client'

export default function ClientPicker({
  clients,
  value,
  onChange,
  inputClass,
  placeholder = 'Search clients...',
  disabled = false,
}: ClientPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectedClient = clients.find((client) => client.id === value)

  useEffect(() => {
    if (selectedClient) {
      setQuery(getClientLabel(selectedClient))
    } else if (!open) {
      setQuery('')
    }
  }, [open, selectedClient])

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [open])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = term
      ? clients.filter((client) =>
          `
            ${client.company || ''}
            ${client.name || ''}
            ${client.email || ''}
            ${client.phone || ''}
          `
            .toLowerCase()
            .includes(term)
        )
      : clients

    return filtered.slice(0, 20)
  }, [clients, query])

  const selectClient = (clientId: string) => {
    onChange(clientId)
    setOpen(false)
  }

  const clearClient = () => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
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
        />

        {value && (
          <button
            type="button"
            className="border border-slate-200 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={clearClient}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.length > 0 ? (
            matches.map((client) => (
              <button
                key={client.id}
                type="button"
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectClient(client.id)}
              >
                <span className="font-medium text-slate-900">
                  {client.company || 'Unnamed company'}
                </span>

                <span className="block text-xs text-slate-500">
                  {[client.name, client.email].filter(Boolean).join(' - ') || 'No contact details'}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500">
              No clients found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
