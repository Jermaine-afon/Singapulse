import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { StartPoint } from '../types';
import { POPULAR_START_POINTS } from '../data/landmarks';
import { searchOneMap, getOneMapResultName, toDisplayCase } from '../services/oneMapService';

interface StartPointPickerProps {
  value: StartPoint;
  onChange: (point: StartPoint) => void;
  label?: string;
}

interface Option {
  key: string;
  point: StartPoint;
  detail?: string;
  group: 'suggested' | 'search';
}

const SEARCH_DEBOUNCE_MS = 250;
const MAX_RESULTS = 6;

/**
 * Starting point field: search any address, hotel, postcode or MRT station via OneMap,
 * or pick a popular starting point. Only an explicit selection changes the value.
 */
export const StartPointPicker: React.FC<StartPointPickerProps> = ({ value, onChange, label = 'Starting from' }) => {
  const [query, setQuery] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Option[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestSearch = useRef(0);
  const listId = useId();
  const inputId = useId();

  const isEditing = query.trim() !== value.name;
  const searchText = isEditing ? query.trim() : '';

  // Keep the field in sync when the value changes elsewhere (e.g. the other picker)
  useEffect(() => {
    if (!isOpen) setQuery(value.name);
  }, [value.name, isOpen]);

  // Debounced OneMap search; ignore responses that arrive after a newer query
  useEffect(() => {
    if (searchText.length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchFailed(false);
      return;
    }
    const requestId = ++latestSearch.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchOneMap(searchText);
        if (requestId !== latestSearch.current) return;
        const seen = new Set<string>();
        const options: Option[] = [];
        for (const res of found) {
          const lat = parseFloat(res.LATITUDE);
          const lng = parseFloat(res.LONGITUDE);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const name = toDisplayCase(getOneMapResultName(res));
          if (seen.has(name)) continue;
          seen.add(name);
          const address = toDisplayCase(res.ADDRESS || '');
          options.push({
            key: `search-${name}-${lat}-${lng}`,
            point: { name, lat, lng },
            detail: address && address !== name ? address : undefined,
            group: 'search',
          });
          if (options.length >= MAX_RESULTS) break;
        }
        setResults(options);
        setSearchFailed(false);
      } catch {
        if (requestId === latestSearch.current) {
          setResults([]);
          setSearchFailed(true);
        }
      } finally {
        if (requestId === latestSearch.current) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const suggestions: Option[] = useMemo(() => {
    const needle = searchText.toLowerCase();
    return POPULAR_START_POINTS.filter((sp) => !needle || sp.name.toLowerCase().includes(needle)).map((sp) => ({
      key: `preset-${sp.name}`,
      point: { name: sp.name, lat: sp.lat, lng: sp.lng },
      group: 'suggested' as const,
    }));
  }, [searchText]);

  const options = useMemo(() => [...results, ...suggestions], [results, suggestions]);

  // Reset the highlighted option whenever the list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [options.length, searchText]);

  const close = (revert = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (revert) setQuery(value.name);
  };

  const select = (option: Option) => {
    onChange(option.point);
    setQuery(option.point.name);
    close(false);
    inputRef.current?.blur();
  };

  // Clicking anywhere else closes the list and restores the current value
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value.name]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (event.key === 'Enter') {
      if (isOpen && options.length) {
        event.preventDefault(); // don't submit the planner form mid-search
        select(options[activeIndex >= 0 ? activeIndex : 0]);
      }
    } else if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        event.stopPropagation(); // keep a surrounding dialog open
        close();
      }
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;
  const showSearchStatus = searchText.length >= 2;

  const renderOption = (option: Option, index: number) => {
    const active = index === activeIndex;
    const selected = option.point.name === value.name;
    return (
      <li
        key={option.key}
        id={optionId(index)}
        role="option"
        aria-selected={selected}
        onMouseDown={(e) => e.preventDefault()} // keep focus in the input until selection
        onClick={() => select(option)}
        onMouseEnter={() => setActiveIndex(index)}
        className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${active ? 'bg-canvas-soft' : ''}`}
      >
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-body" aria-hidden="true" />
        <span className="min-w-0">
          <span className={`block text-[15px] text-ink ${selected ? 'font-semibold' : ''}`}>{option.point.name}</span>
          {option.detail && <span className="block truncate text-sm text-mute">{option.detail}</span>}
        </span>
      </li>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder="Hotel, address, postcode or MRT"
          onFocus={(e) => {
            setIsOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="input pl-11 pr-11"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-body" aria-hidden="true" />
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-canvas p-2 shadow-[0_8px_24px_rgb(14_15_12/0.16)] animate-fade">
          <ul id={listId} role="listbox" aria-label={label}>
            {results.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-2 text-sm font-semibold text-body">
                Places in Singapore
              </li>
            )}
            {results.map((option, i) => renderOption(option, i))}

            {suggestions.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-2 text-sm font-semibold text-body">
                Popular starting points
              </li>
            )}
            {suggestions.map((option, i) => renderOption(option, results.length + i))}
          </ul>

          {showSearchStatus && !isSearching && results.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-body">
              {searchFailed
                ? "Place search isn't available right now. Pick a popular starting point instead."
                : `No places found for "${searchText}". Try a street, building, postcode or MRT station.`}
            </p>
          )}
          {!showSearchStatus && (
            <p className="px-3 pb-1 pt-2 text-sm text-mute">Type to search any address, hotel, postcode or MRT station.</p>
          )}
        </div>
      )}
    </div>
  );
};
