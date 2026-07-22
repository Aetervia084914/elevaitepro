'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2, Search } from 'lucide-react';

import { getHeadlineSuggestions } from '../services/services.js';
import { cn } from '../lib/utils.js';
import { Input } from './ui/input.jsx';


function getDisplayValue(suggestion) {
  return suggestion.alias_headline || suggestion.canonical_headline;
}


export function ProfessionalHeadlineAutocomplete({
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder = 'Your professional headline',
  inputClassName = '',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const suppressFetchRef = useRef(false);
  const listboxId = useId();

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmedValue = value.trim();
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
      return undefined;
    }
    if (disabled || trimmedValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await getHeadlineSuggestions(trimmedValue, 5, controller.signal);
        const nextSuggestions = response.suggestions || [];
        setSuggestions(nextSuggestions);
        setIsOpen(nextSuggestions.length > 0);
        setHighlightedIndex(nextSuggestions.length > 0 ? 0 : -1);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setSuggestions([]);
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, value]);

  function commitSuggestion(suggestion) {
    const displayValue = getDisplayValue(suggestion);
    suppressFetchRef.current = true;
    onChange(displayValue);
    onSelect?.({ ...suggestion, displayValue });
    setIsOpen(false);
    setHighlightedIndex(-1);
    setSuggestions([]);
  }

  function handleKeyDown(event) {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => (currentIndex + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => (currentIndex <= 0 ? suggestions.length - 1 : currentIndex - 1));
      return;
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      commitSuggestion(suggestions[highlightedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          role="combobox"
          className={cn('pl-11 pr-11', inputClassName)}
        />
        {isLoading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-vibrant-azure" />}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[20px] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
          <ul id={listboxId} role="listbox" className="max-h-80 overflow-y-auto py-2">
            {suggestions.map((suggestion, index) => {
              const isActive = index === highlightedIndex;
              const displayValue = getDisplayValue(suggestion);
              return (
                <li key={`${suggestion.canonical_headline}-${suggestion.alias_headline || 'canonical'}`} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commitSuggestion(suggestion)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      isActive ? 'bg-vibrant-azure/8' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border', isActive ? 'border-vibrant-azure bg-vibrant-azure/10' : 'border-slate-200 bg-slate-50')}>
                      {isActive ? <Check className="h-4 w-4 text-vibrant-azure" /> : <Search className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold tracking-tight text-slate-900">{displayValue}</div>
                      <div className="mt-1 truncate text-[12px] font-medium text-slate-500">
                        Canonical: {suggestion.canonical_headline}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                        {suggestion.industry && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{suggestion.industry}</span>}
                        <span className="rounded-full bg-vibrant-azure/10 px-2.5 py-1 text-vibrant-azure">
                          Score {(suggestion.score * 100).toFixed(1)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{suggestion.source_dataset}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
