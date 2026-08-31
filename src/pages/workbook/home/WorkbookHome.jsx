import { useState, useRef, useEffect, useCallback } from 'react';
import { MenuBar } from '@/ui/components/MenuBar';
import { SparkleIcon } from './icons/SparkleIcon';
import {
  ArrowUp,
  CaretDown,
  Compass,
  Play,
  Lightbulb,
  Check,
} from '@phosphor-icons/react';
import './WorkbookHome.css';

const ANALYSIS_MODES = [
  {
    id: 'build-analysis',
    label: 'Build an Analysis',
    icon: Compass,
    description: 'Create a multi-step analysis with full control over each step',
  },
  {
    id: 'quick-analysis',
    label: 'Quick Analysis',
    icon: Play,
    description: 'Best when you know exactly what you need',
  },
  {
    id: 'explore-data',
    label: 'Explore data',
    icon: Lightbulb,
    description: "Browse your data, understand what's available, ask data-discovery questions",
  },
];

/*
 * WorkbookHome — landing page with centered search prompt
 *
 * The sidebar uses our MenuBar component (closed by default).
 * The hero area is vertically + horizontally centered with a
 * sparkle-adorned heading and an interactive search bar.
 */

const NAV_ITEMS = [
  { id: 'chats', label: 'Workbook', icon: 'chats' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'data-hub', label: 'Data Hub', icon: 'data-hub' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'project', label: 'Projects', icon: 'project' },
];

export function WorkbookHome({
  user = { name: 'Ammie Diego', initials: 'AD', email: 'ammie.diego@work.com' },
  historyGroups = [],
  onNavigate,
  onSubmit,
  menuOpen,
  onMenuToggle,
}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMode, setSelectedMode] = useState('build-analysis');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentMode = ANALYSIS_MODES.find((m) => m.id === selectedMode);
  const ModeIcon = currentMode.icon;

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleModeSelect = useCallback((modeId) => {
    setSelectedMode(modeId);
    setDropdownOpen(false);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim() && onSubmit) {
      onSubmit(query.trim(), selectedMode);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  return (
    <div className="workbook-home">
      {/* Sidebar */}
      <MenuBar
        items={NAV_ITEMS}
        onItemClick={(id) => onNavigate && onNavigate(id)}
        historyGroups={historyGroups}
        user={user}
        onNewChat={() => onNavigate && onNavigate('new-chat')}
        isOpen={menuOpen}
        onToggle={onMenuToggle}
        onProfile={() => onNavigate && onNavigate('profile')}
        onSettings={() => onNavigate && onNavigate('settings')}
      />

      {/* Main content area */}
      <main className="workbook-home__body">
        <div className="workbook-home__hero">
          {/* Title */}
          <div className="workbook-home__title">
            <SparkleIcon />
            <h1 className="workbook-home__heading">
              What's on the agenda today?
            </h1>
          </div>

          {/* Search box */}
          <form className="workbook-home__search" onSubmit={handleSubmit}>
            <div
              className={[
                'workbook-home__search-box',
                isFocused ? 'workbook-home__search-box--focused' : '',
                query.length > 0 ? 'workbook-home__search-box--filled' : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                type="text"
                className="workbook-home__input"
                placeholder="What would you like to analyze?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
              />

              <div className="workbook-home__actions">
                {/* Mode dropdown pill */}
                <div className="workbook-home__mode-wrapper" ref={dropdownRef}>
                  <button
                    className="workbook-home__mode-pill"
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                  >
                    <ModeIcon
                      size={12}
                      weight="regular"
                      color="var(--color-primary-500)"
                    />
                    <span className="text-body-2-regular workbook-home__mode-label">
                      {currentMode.label}
                    </span>
                    <span className={`workbook-home__mode-pill-caret${dropdownOpen ? ' workbook-home__mode-pill-caret--open' : ''}`}>
                      <CaretDown size={12} weight="regular" color="var(--color-primary-500)" />
                    </span>
                  </button>

                  {dropdownOpen && (
                    <div className="workbook-home__dropdown" role="listbox">
                      {ANALYSIS_MODES.map((mode) => {
                        const IconComp = mode.icon;
                        const isSelected = mode.id === selectedMode;
                        return (
                          <button
                            key={mode.id}
                            className={`workbook-home__dropdown-item ${isSelected ? 'workbook-home__dropdown-item--selected' : ''}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleModeSelect(mode.id)}
                          >
                            <IconComp
                              className="workbook-home__dropdown-icon"
                              size={12}
                              weight="regular"
                              color={
                                isSelected
                                  ? 'var(--color-primary-500)'
                                  : 'var(--color-text-primary)'
                              }
                            />
                            <div className="workbook-home__dropdown-content">
                              <span
                                className={`text-body-2-medium workbook-home__dropdown-label ${isSelected ? 'workbook-home__dropdown-label--selected' : ''}`}
                              >
                                {mode.label}
                              </span>
                              <span className="workbook-home__dropdown-desc text-metadata-regular">
                                {mode.description}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="workbook-home__dropdown-check">
                                <Check
                                  size={12}
                                  weight="regular"
                                  color="var(--color-primary-500)"
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className={[
                    'workbook-home__submit',
                    query.trim().length > 0 ? 'workbook-home__submit--active' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label="Submit"
                  disabled={query.trim().length === 0}
                >
                  <ArrowUp size={12} weight="bold" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
