"use client"

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ClientLocationDropdown({ 
  value, 
  onChange, 
  clients = [], 
  placeholder = "Search for client and location",
  label = ""
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Filter clients by name - will show clients that match the search term
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (client) => {
    // Use address for routing, fallback to coordinates or name
    const location = client.address || client.coordinates || client.name
    onChange(location)
    setIsOpen(false)
    setSearchTerm('')
  }

  // Find the selected client to display its name and address
  const selectedClient = clients.find(c => 
    (c.address && c.address === value) || 
    (c.coordinates && c.coordinates === value) ||
    c.name === value
  )

  const displayValue = selectedClient 
    ? `${selectedClient.name}${selectedClient.address ? ' - ' + selectedClient.address : ''}`
    : value || ''

  return (
    <div className="relative" ref={dropdownRef}>
      {label && <label className="text-sm font-medium block mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md max-h-80">
          <div className="flex items-center border-b px-3 py-2 sticky top-0 bg-popover">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {filteredClients.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No clients found.' : 'Start typing to search clients...'}
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = (client.address && client.address === value) || 
                                  (client.coordinates && client.coordinates === value) ||
                                  client.name === value
                return (
                  <div
                    key={client.id}
                    className={cn(
                      "relative flex cursor-default select-none items-start rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(client)}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-2 mt-0.5" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="font-semibold truncate">{client.name}</div>
                      {client.address && (
                        <div className="text-xs text-muted-foreground">
                          📍 {client.address}
                        </div>
                      )}
                      {client.coordinates && !client.address && (
                        <div className="text-xs text-muted-foreground">
                          📌 {client.coordinates.substring(0, 45)}{client.coordinates.length > 45 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
