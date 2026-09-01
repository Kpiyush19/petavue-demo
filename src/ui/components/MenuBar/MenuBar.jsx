import { useState } from 'react';
import { MenuBarItem } from './MenuBarItem';
import { HistoryPanel } from './HistoryPanel';
import { UserProfile } from './UserProfile';
import { SidebarToggle } from './icons/SidebarToggle';
import { BrandLogo } from './icons/BrandLogo';
import './MenuBar.css';

// Canonical nav — the SINGLE source of truth for both navbars. The app navbar
// (src/components/MenuBarNav) imports this rather than keeping its own copy, so
// the two can't drift: previously each had its own list and they had already
// diverged in both membership and order.
//
// Order is deliberate. The rail is read top-to-bottom in the first second and,
// closed, position is the only hierarchy signal there is — so it leads with the
// pitch: Workflows (what we automate), then Agents (how). Data Hub sits last as
// the foundation layer. Dashboard and Skills are real capability but no longer
// the headline, so they sit below.
//
// Every page that passes an `items` prop to <MenuBar> is ignored on purpose
// (see below) — edit this list, not the caller.
//
// Goals sits with Workflows and Agents rather than among the older surfaces —
// it's the same kind of thing (a monitored module that produces recommendations),
// so it belongs in that group.
//
// Deliberately NOT in the nav (route still live, reachable by URL):
//   contexts — no page yet; it was a tooltip-only affordance.
const ALL_NAV = [
  { id: 'workflows', label: 'Workflows', icon: 'workflows' },
  { id: 'agents', label: 'Agents', icon: 'agents' },
  { id: 'recommendations', label: 'Recommendations', icon: 'goals' },
  { id: 'dashboard-live', label: 'Dashboard', icon: 'dashboard' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'data-hub', label: 'Data Hub', icon: 'data-hub' },
];

// The demo shows only the three surfaces the story runs through. Dashboard,
// Skills and Data Hub are real product sections but nothing in the walkthrough
// visits them, and a nav item that opens an unrelated screen mid-demo is worse
// than no nav item. Their routes still resolve if typed — this hides the
// entrances, it does not delete the pages. Drop an id from HIDDEN_NAV to bring
// one back.
const HIDDEN_NAV = ['dashboard-live', 'skills', 'data-hub'];

export const CANONICAL_NAV = ALL_NAV.filter((item) => !HIDDEN_NAV.includes(item.id));

/*
 * Petavue MenuBar — collapsible sidebar navigation
 *
 * Props:
 *   items          — array of { id, label, icon }
 *   activeId       — currently active nav item id
 *   onItemClick    — callback(id) when a nav item is clicked
 *   historyGroups  — array of { label, items: [{ id, title, time }] }
 *   user           — { name, initials, email }
 *   onNewChat      — callback when "New Chat" is clicked
 *   onUserClick    — callback when user profile is clicked
 *   onProfile      — callback when Profile is clicked in user dropdown
 *   onSettings     — callback when Settings is clicked in user dropdown
 *   onLogout       — callback when Log out is clicked in user dropdown
 *   defaultOpen    — initial open/closed state (default: true)
 */

export function MenuBar({
  items = [],
  activeId,
  onItemClick,
  historyGroups = [],
  user = { name: 'User', initials: 'U', email: '' },
  onNewChat,
  onUserClick,
  onProfile,
  onSettings,
  onLogout,
  defaultOpen = true,
  isOpen: controlledOpen,
  onToggle,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (v) => onToggle && onToggle(v) : setInternalOpen;
  const [logoHovered, setLogoHovered] = useState(false);

  return (
    <nav className={`menubar ${isOpen ? 'menubar--open' : 'menubar--closed'}`}>
      {/* Header: logo + toggle */}
      <div className="menubar__header">
        {isOpen ? (
          <>
            <div
              className={`menubar__brand ${logoHovered ? 'menubar__brand--hovered' : ''}`}
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
            >
              <BrandLogo />
              <span className="menubar__brand-text">
                <span className="menubar__brand-bold">Peta</span>
                <span className="menubar__brand-regular">vue</span>
              </span>
            </div>
            <button
              className="menubar__toggle"
              onClick={() => setIsOpen(false)}
              aria-label="Collapse sidebar"
            >
              <SidebarToggle />
            </button>
          </>
        ) : (
          <div
            className="menubar__logo-closed"
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
          >
            <button
              className={`menubar__toggle menubar__toggle--logo ${logoHovered ? 'menubar__toggle--logo-hovered' : ''}`}
              onClick={() => setIsOpen(true)}
              aria-label="Expand sidebar"
            >
              {/* Show sidebar icon on hover, P logo at rest */}
              {logoHovered ? (
                <SidebarToggle color="var(--color-grey-800, #2D3044)" />
              ) : (
                <BrandLogo />
              )}
            </button>
            {logoHovered && (
              <span className="menubar__logo-tooltip">Open sidebar</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation items */}
      <div className="menubar__nav">
        {/* Create New (chat) is hidden for the demo — the walkthrough never
            starts from a blank chat, and it was the one button that could drop
            a viewer out of the product story. Restore by un-commenting. */}
        {/*
        <MenuBarItem
          icon="new-chat"
          label="Create New"
          isOpen={isOpen}
          isAccent
          onClick={onNewChat}
        />
        */}

        {/* Canonical nav — same ids/order as the app navbar so buttons never
            jump position between pages. The `items` prop is ignored on purpose. */}
        {CANONICAL_NAV.map((item) => (
          <MenuBarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isOpen={isOpen}
            isActive={activeId === item.id}
            title={item.title}
            onClick={() => onItemClick && onItemClick(item.id)}
          />
        ))}
      </div>

      {/* History panel — only in open state */}
      {isOpen && historyGroups.length > 0 && (
        <HistoryPanel groups={historyGroups} />
      )}

      {/* User profile at bottom */}
      <div className="menubar__footer">
        <UserProfile
          name={user.name}
          initials={user.initials}
          email={user.email}
          isOpen={isOpen}
          onProfile={onProfile}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}
