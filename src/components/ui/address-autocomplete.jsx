'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, X, Loader2, Store, Building2 } from 'lucide-react'
import { searchPlaces, getPlaceDetails } from '@/lib/google-geocoding'

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  onCoordinatesChange,
  onAddressSelect,
  placeholder = 'Search for a place, mall, address...',
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const isLockedRef = useRef(false)
  const fetchIdRef = useRef(0)

  const doSearch = useCallback(async (query) => {
    if (isLockedRef.current) return
    if (!query || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const thisFetch = ++fetchIdRef.current
    setIsLoading(true)
    try {
      const results = await searchPlaces(query, 7)
      if (thisFetch !== fetchIdRef.current) return
      setSuggestions(results)
      setShowSuggestions(results.length > 0 && !isLockedRef.current)
    } catch {
      if (thisFetch !== fetchIdRef.current) return
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      if (thisFetch === fetchIdRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(value), 300)
    return () => clearTimeout(t)
  }, [value, doSearch])

  const handleSelect = async (suggestion) => {
    isLockedRef.current = true
    fetchIdRef.current++
    setShowSuggestions(false)
    setSuggestions([])
    setIsLoading(true)

    const displayText = suggestion.place_name || suggestion.description
    onChange(displayText)

    try {
      const details = await getPlaceDetails(suggestion.place_id)
      if (details) {
        const finalText = details.formatted_address || displayText
        onChange(finalText)
        if (onCoordinatesChange) onCoordinatesChange({ lat: details.lat, lng: details.lng })
        if (onAddressSelect) {
          onAddressSelect({
            street: details.street,
            city: details.city,
            state: details.state,
            country: details.country,
            formatted_address: details.formatted_address,
          })
        }
      }
    } catch (e) {
      console.error('Error fetching place details:', e)
    } finally {
      setIsLoading(false)
      isLockedRef.current = false
    }
  }

  const clearInput = () => {
    isLockedRef.current = true
    fetchIdRef.current++
    onChange('')
    setSuggestions([])
    setShowSuggestions(false)
    isLockedRef.current = false
    inputRef.current?.focus()
  }

  const getPlaceIcon = (types) => {
    if (!types) return <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
    if (types.some((t) => t.includes('shopping') || t.includes('store') || t.includes('mall')))
      return <Store className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
    if (types.some((t) => t.includes('point_of_interest') || t.includes('establishment')))
      return <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
    return <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
  }

  return (
    <div className="relative space-y-2">
      <Label htmlFor="address-input">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={value || ''}
          onChange={(e) => {
            if (!isLockedRef.current) onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowSuggestions(false)
              isLockedRef.current = false
            }
          }}
          onFocus={() => {
            if (!isLockedRef.current && suggestions.length > 0) setShowSuggestions(true)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          required={required}
          autoComplete="off"
        />
        {value && !isLockedRef.current && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearInput}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin h-4 w-4 text-blue-600" />
          </div>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((s, i) => (
              <div
                key={s.place_id || i}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-start space-x-3">
                  {getPlaceIcon(s.types)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.text || s.description}
                    </p>
                    {s.secondary_text && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {s.secondary_text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
