import { useState } from 'react';
import {
  PlusCircleIcon,
  BookBookmarkIcon,
  FolderIcon,
  SquaresFourIcon,
  FilesIcon,
  DatabaseIcon,
  GearIcon,
  SkillsIcon,
  HomeIcon,
  GoalsIcon,
  SageIcon,
  SquaresGridIcon,
  WorkflowsIcon,
  ContextsIcon,
  AgentsIcon,
} from './icons/NavIcons';

/*
 * Single navigation item — renders as icon-only (closed) or icon+label (open)
 *
 * States from Figma:
 *   Rest         — neutral icon, no background
 *   Hover        — primary-50 background, icon stays neutral
 *   Active       — icon + label turn primary-500 blue, no background
 *   Active Hover — primary-50 background, icon + label stay blue
 *   Closed Hover — primary-50 bg on icon + tooltip with label
 */

const ICON_MAP = {
  'new-chat': PlusCircleIcon,
  'chats': BookBookmarkIcon,
  'project': FolderIcon,
  'dashboard': SquaresFourIcon,
  'reports': FilesIcon,
  'data-hub': DatabaseIcon,
  'skills': SkillsIcon,
  'settings': GearIcon,
  'home': HomeIcon,
  'goals': GoalsIcon,
  'sage': SageIcon,
  'grid': SquaresGridIcon,
  'workflows': WorkflowsIcon,
  'contexts': ContextsIcon,
  'agents': AgentsIcon,
};

export function MenuBarItem({
  icon,
  label,
  isOpen = true,
  isActive = false,
  isAccent = false,
  onClick,
  // Optional native hover tooltip (shows in both open & closed states). Used
  // for items that don't navigate — e.g. Contexts, which has no page yet.
  title,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = ICON_MAP[icon];

  const className = [
    'menubar-item',
    isOpen ? 'menubar-item--open' : 'menubar-item--closed',
    isActive ? 'menubar-item--active' : '',
    isAccent ? 'menubar-item--accent' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="menubar-item__icon">
        {IconComponent && (
          <IconComponent isAccent={isAccent} isActive={isActive} />
        )}
      </span>
      {isOpen && (
        <span className="menubar-item__label">{label}</span>
      )}
      {/* Tooltip for closed state on hover */}
      {!isOpen && isHovered && (
        <span className="menubar-item__tooltip">{label}</span>
      )}
    </button>
  );
}
