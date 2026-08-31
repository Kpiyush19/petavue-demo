import { useState, useRef, useEffect } from 'react';
import { MenuBar } from '@/ui/components/MenuBar';
import { Button } from '@/ui/components/Button/Button';
import { Tag } from '@/ui/components/Tags/Tag/Tag';
import {
  MagnifyingGlass,
  Funnel,
  Plus,
  DotsThree,
  FolderPlus,
  Timer,
  PencilSimple,
  Folder,
  Copy,
} from '@phosphor-icons/react';
import './WorkbookList.css';

const WORKBOOKS = [
  { id: 1, name: 'Q1 Pipeline Review', status: 'saved', date: '31 Jan, 2026 at 04:08 PM' },
  { id: 2, name: 'Lead Attribution & Gap Analysis', status: 'scheduled', date: '31 Jan, 2026 at 12:22 PM' },
  { id: 3, name: 'SQL Data Check in Hubspot/Salesforce', status: 'saved', date: '31 Jan, 2026 at 06:12 PM' },
  { id: 4, name: 'Attribution Insights Data Availability', status: 'scheduled', date: '30 Jan, 2026 at 01:09 PM' },
  { id: 5, name: 'Activities for Closed Deals Plan', status: 'saved', date: '30 Jan, 2026 at 12:11 PM' },
  { id: 6, name: 'Risk Summary of an Account', status: 'saved', date: '10 Jan, 2026 at 9:22 AM' },
  { id: 7, name: 'Win Rate Heatmap by Sales Rep and Deal Size', status: 'saved', date: '10 Jan, 2026 at 01:09 PM' },
  { id: 8, name: 'Sales Funnel Drop-off Rate', status: 'scheduled', date: '9 Jan, 2026 at 8:15 AM' },
  { id: 9, name: 'Q4 2025 Lead Conversion', status: 'scheduled', date: '5 Jan, 2026 at 11:15 AM' },
  { id: 10, name: 'Lead Conversion Performance', status: 'saved', date: '7 Jan, 2026 at 11:50 PM' },
];

const NAV_ITEMS = [
  { id: 'chats', label: 'Workbook', icon: 'chats' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'data-hub', label: 'Data Hub', icon: 'data-hub' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'project', label: 'Projects', icon: 'project' },
];

function StatusTag({ status }) {
  if (status === 'saved') {
    return (
      <Tag color="blue" size="sm" prefixIcon={FolderPlus}>
        Saved
      </Tag>
    );
  }
  return (
    <Tag color="column" size="sm" prefixIcon={Timer}>
      Every 24 hours
    </Tag>
  );
}

function ActionDropdown({ onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="workbook-list__dropdown" ref={ref}>
      <button className="workbook-list__dropdown-item" onClick={onClose}>
        <span className="workbook-list__dropdown-icon">
          <PencilSimple size={16} weight="regular" />
        </span>
        Rename
      </button>
      <button className="workbook-list__dropdown-item" onClick={onClose}>
        <span className="workbook-list__dropdown-icon">
          <Folder size={16} weight="regular" />
        </span>
        Add to project
      </button>
      <button className="workbook-list__dropdown-item" onClick={onClose}>
        <span className="workbook-list__dropdown-icon">
          <Copy size={16} weight="regular" />
        </span>
        Clone
      </button>
    </div>
  );
}

function WorkbookRow({ index, workbook, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`workbook-list__row${onSelect ? ' workbook-list__row--clickable' : ''}`} onClick={onSelect ? () => onSelect(workbook) : undefined}>
      <span className="workbook-list__row-num">{index}.</span>
      <span
        className={`workbook-list__row-name${onSelect ? ' workbook-list__row-name--clickable' : ''}`}
      >{workbook.name}</span>
      <span className="workbook-list__col-status">
        <StatusTag status={workbook.status} />
      </span>
      <span className="workbook-list__row-date">{workbook.date}</span>
      <div className="workbook-list__dots-wrapper">
        <button
          className="workbook-list__dots-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Actions"
        >
          <DotsThree size={20} weight="regular" />
        </button>
        {menuOpen && <ActionDropdown onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

export function WorkbookList({
  user = { name: 'Ammie Diego', initials: 'AD', email: 'ammie.diego@work.com' },
  onNavigate,
  onNewWorkbook,
  onSelectWorkbook,
  menuOpen,
  onMenuToggle,
}) {
  const [search, setSearch] = useState('');

  const filtered = WORKBOOKS.filter((wb) =>
    wb.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="workbook-list">
      <MenuBar
        items={NAV_ITEMS}
        activeId="chats"
        onItemClick={(id) => onNavigate && onNavigate(id)}
        user={user}
        onNewChat={() => onNavigate && onNavigate('new-chat')}
        isOpen={menuOpen}
        onToggle={onMenuToggle}
        onProfile={() => onNavigate && onNavigate('profile')}
        onSettings={() => onNavigate && onNavigate('settings')}
      />

      <div className="workbook-list__body">
        {/* Page header */}
        <div className="workbook-list__header">
          <span className="workbook-list__breadcrumb">Workbooks</span>
        </div>

        {/* List container */}
        <div className="workbook-list__container">
          {/* Toolbar */}
          <div className="workbook-list__toolbar">
            <div className="workbook-list__tabs">
              <div className="workbook-list__tab">
                My Workbooks
                <span className="workbook-list__tab-count">{filtered.length}</span>
              </div>
            </div>
            <div className="workbook-list__actions">
              <div className="workbook-list__search">
                <span className="workbook-list__search-icon">
                  <MagnifyingGlass size={16} weight="regular" />
                </span>
                <input
                  type="text"
                  className="workbook-list__search-input"
                  placeholder="Search workbooks"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                icon={Funnel}
                aria-label="Filter"
              />
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                label="New Workbook"
                onClick={onNewWorkbook}
              />
            </div>
          </div>

          {/* Table */}
          <div className="workbook-list__table">
            <div className="workbook-list__table-header">
              <span className="workbook-list__col-num workbook-list__col-label">#</span>
              <span className="workbook-list__col-name workbook-list__col-label">Name</span>
              <span className="workbook-list__col-status workbook-list__col-label">Status</span>
              <span className="workbook-list__col-date workbook-list__col-label">Created on</span>
              <span className="workbook-list__col-actions" />
            </div>
            <div className="workbook-list__rows">
              {filtered.map((wb, i) => (
                <WorkbookRow
                  key={wb.id}
                  index={i + 1}
                  workbook={wb}
                  onSelect={wb.id === 1 ? onSelectWorkbook : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
