import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';

/* Shared context: only one modify instance open at a time + shared modifications */
const ModifyContext = createContext({
  activeModifyId: null,
  setActiveModifyId: () => {},
  modifications: [],
  addModification: () => {},
  editModification: () => {},
  deleteModification: () => {},
  clearModifications: () => {},
  applyingChanges: false,
  applyChanges: () => {},
  planVersion: 1,
  viewingVersion: 1,
  isViewingOldVersion: false,
  running: false,
  allStepsDone: false,
  activeAnalysisStep: 0,
  setActiveAnalysisStep: () => {},
  runAllSteps: () => {},
});
import { MenuBar } from '@/ui/components/MenuBar';
import { Button } from '@/ui/components/Button/Button';
import { Dialog } from '@/ui/components/Dialog/Dialog';
import { Toast } from '@/ui/components/Toast/Toast';
import { TextInput } from '@/ui/components/TextInput/TextInput';
import { TextArea } from '@/ui/components/TextArea/TextArea';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import {
  CaretDown,
  CaretRight,
  CaretUp,
  FolderPlus,
  ShareNetwork,
  ListMagnifyingGlass,
  List,
  Pause,
  Play,
  Square,
  ArrowUp,
  ClipboardText,
  Table,
  BookOpenText,
  CheckCircle,
  PencilSimpleLine,
  PencilSimple,
  TrashSimple,
  ChatTeardropText,
  DotsThree,
  X,
  Eye,
  Circle,
  ChartBar,
  GearSix,
  Sparkle,
  SquaresFour,
  DownloadSimple,
  CaretLeft,
  ArrowCounterClockwise,
  Copy,
  Compass,
  Lightbulb,
  Check,
  Notepad,
  FloppyDisk,
  Plus,
} from '@phosphor-icons/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { PlannerChip } from '@/ui/components/Tags/PlannerChip/PlannerChip';
import { ModifyPlan } from '@/ui/components/ModifyPlan/ModifyPlan';
import { Tooltip } from '@/ui/components/Popover/Tooltip/Tooltip';
import { TabToggle } from '@/ui/components/TabToggle/TabToggle';
import { ListDropdown } from '@/ui/components/ListDropdown/ListDropdown';
import cardPreviewImg from './assets/card-preview.png';
import spinnerGif from '@/ui/assets/spinner.gif';
import './WorkbookChat.css';

const NAV_ITEMS = [
  { id: 'chats', label: 'Workbook', icon: 'chats' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'data-hub', label: 'Data Hub', icon: 'data-hub' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'project', label: 'Projects', icon: 'project' },
];

/* Custom mode icons (from Figma) */
function MemoIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" />
    </svg>
  );
}

function DashboardIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.875 1.875H2.625C2.42609 1.875 2.23532 1.95402 2.09467 2.09467C1.95402 2.23532 1.875 2.42609 1.875 2.625V5.625C1.875 5.82391 1.95402 6.01468 2.09467 6.15533C2.23532 6.29598 2.42609 6.375 2.625 6.375H4.875C5.07391 6.375 5.26468 6.29598 5.40533 6.15533C5.54598 6.01468 5.625 5.82391 5.625 5.625V2.625C5.625 2.42609 5.54598 2.23532 5.40533 2.09467C5.26468 1.95402 5.07391 1.875 4.875 1.875ZM4.875 5.625H2.625V2.625H4.875V5.625ZM9.375 1.875H7.125C6.92609 1.875 6.73532 1.95402 6.59467 2.09467C6.45402 2.23532 6.375 2.42609 6.375 2.625V4.125C6.375 4.32391 6.45402 4.51468 6.59467 4.65533C6.73532 4.79598 6.92609 4.875 7.125 4.875H9.375C9.57391 4.875 9.76468 4.79598 9.90533 4.65533C10.046 4.51468 10.125 4.32391 10.125 4.125V2.625C10.125 2.42609 10.046 2.23532 9.90533 2.09467C9.76468 1.95402 9.57391 1.875 9.375 1.875ZM9.375 4.125H7.125V2.625H9.375V4.125ZM4.875 7.125H2.625C2.42609 7.125 2.23532 7.20402 2.09467 7.34467C1.95402 7.48532 1.875 7.67609 1.875 7.875V9.375C1.875 9.57391 1.95402 9.76468 2.09467 9.90533C2.23532 10.046 2.42609 10.125 2.625 10.125H4.875C5.07391 10.125 5.26468 10.046 5.40533 9.90533C5.54598 9.76468 5.625 9.57391 5.625 9.375V7.875C5.625 7.67609 5.54598 7.48532 5.40533 7.34467C5.26468 7.20402 5.07391 7.125 4.875 7.125ZM4.875 9.375H2.625V7.875H4.875V9.375ZM9.375 5.625H7.125C6.92609 5.625 6.73532 5.70402 6.59467 5.84467C6.45402 5.98532 6.375 6.17609 6.375 6.375V9.375C6.375 9.57391 6.45402 9.76468 6.59467 9.90533C6.73532 10.046 6.92609 10.125 7.125 10.125H9.375C9.57391 10.125 9.76468 10.046 9.90533 9.90533C10.046 9.76468 10.125 9.57391 10.125 9.375V6.375C10.125 6.17609 10.046 5.98532 9.90533 5.84467C9.76468 5.70402 9.57391 5.625 9.375 5.625ZM9.375 9.375H7.125V6.375H9.375V9.375Z" fill={color} />
    </svg>
  );
}

function CheckCircleOutlineIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
    </svg>
  );
}

function ScatterChartIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V200H224A8,8,0,0,1,232,208ZM132,160a12,12,0,1,0-12-12A12,12,0,0,0,132,160Zm-24-56A12,12,0,1,0,96,92,12,12,0,0,0,108,104ZM76,176a12,12,0,1,0-12-12A12,12,0,0,0,76,176Zm96-48a12,12,0,1,0-12-12A12,12,0,0,0,172,128Zm24-40a12,12,0,1,0-12-12A12,12,0,0,0,196,88Zm-20,76a12,12,0,1,0,12-12A12,12,0,0,0,176,164Z" />
    </svg>
  );
}


function DefinitionIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M200,168a32.06,32.06,0,0,0-31,24H72a32,32,0,0,1,0-64h96a40,40,0,0,0,0-80H72a8,8,0,0,0,0,16h96a24,24,0,0,1,0,48H72a48,48,0,0,0,0,96h97a32,32,0,1,0,31-40Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,200,216Z" />
    </svg>
  );
}

function PlayIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" />
    </svg>
  );
}

function CompassIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 256 256">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172.42,72.84l-64,32a8.05,8.05,0,0,0-3.58,3.58l-32,64A8,8,0,0,0,80,184a8.1,8.1,0,0,0,3.58-.84l64-32a8.05,8.05,0,0,0,3.58-3.58l32-64a8,8,0,0,0-10.74-10.74ZM138,138,97.89,158.11,118,118l40.15-20.07Z" />
    </svg>
  );
}

const ANALYSIS_MODE_GROUPS = [
  {
    label: 'Create from Analysis',
    modes: [
      {
        id: 'generate-memo',
        label: 'Generate Memo',
        icon: MemoIcon,
        placeholder: 'Generate a memo summarizing the key findings from this analysis',
      },
      {
        id: 'create-chart',
        label: 'Create Chart',
        icon: ScatterChartIcon,
        placeholder: 'Create a chart from the results of this analysis',
      },
      {
        id: 'save-as-definition',
        label: 'Save as Definition',
        icon: DefinitionIcon,
        placeholder: 'Save the logic from this analysis as a reusable definition',
      },
    ],
  },
  {
    label: 'Start New',
    modes: [
      {
        id: 'quick-analysis',
        label: 'Quick Analysis',
        icon: PlayIcon,
        placeholder: 'Run a quick analysis to answer the following question',
      },
      {
        id: 'build-analysis',
        label: 'Build an Analysis',
        icon: CompassIcon,
        placeholder: 'Build a multi-step analysis to answer the following question',
      },
    ],
  },
];

const ALL_MODES = ANALYSIS_MODE_GROUPS.flatMap((g) => g.modes);

const MOCK_MEMO_CONTENT = `## 📊 Sales Activity Effectiveness Analysis: Key Findings

Based on my comprehensive analysis of 485 closed-won opportunities and 9,326 sales activities over the last 2 years, here are the critical insights on which activities help close deals faster:

## 🎯 Key Discovery: Less is More

The most striking finding is that higher activity volume correlates with LONGER sales cycles, not shorter ones:

- **Low Activity Deals** (0-10 touches): Average 43.33 days to close
- **Medium Activity Deals** (11-30 touches): Average 61.91 days to close
- **High Activity Deals** (31+ touches): Average 100.09 days to close

## 🏆 Most Effective Activity Patterns

### Email Activities - The Hidden Champion
- Correlation with sales cycle: 0.00 (neutral - doesn't extend cycles)
- Usage: Only 0.23% of all activities
- Opportunity: Significantly underutilized despite neutral impact

### Fastest vs. Slowest Deals Comparison

**Fastest 25% of deals:**
- Average cycle: 11.23 days
- Average activities: 16.63 touches

**Slowest 25% of deals:**
- Average cycle: 202.40 days
- Average activities: 99.11 touches

### Activity Distribution Insights
- Calls: 0.94% of activities, 0.10 correlation with longer cycles
- Meetings: 3.84% of activities, 0.19 correlation with longer cycles
- Others: 94.99% of activities, 0.30 correlation (strongest negative impact)

## ⚠️ Critical Issues Identified

### 1. Data Quality Problem
- 94.99% of activities are categorized as "Others" - this obscures what's actually happening
- Poor activity logging prevents accurate analysis of what truly works

### 2. Activity Inefficiency
- High-volume deals take 2.3x longer to close than low-volume deals
- Suggests reps may be busy but not productive

## 🎯 Actionable Recommendations

### Immediate Actions:
1. **Audit "Other" Activities** - Categorize the 94.99% of unspecified activities
2. **Implement Activity Caps** - Monitor deals exceeding optimal activity thresholds
3. **Focus on Quality over Quantity** - Emphasize strategic, high-impact touchpoints`;

const TUTORIAL_CARDS = [
  {
    title: 'Petavue Visualization',
    description:
      'Create trustworthy charts directly from your analysis, refined in seconds.',
    image: cardPreviewImg,
  },
  {
    title: 'Understanding your Data',
    description:
      'See what data is available and how it\'s structured, before you start asking questions.',
    image: cardPreviewImg,
  },
  {
    title: 'Understanding Key Definitions (KDs)',
    description:
      'Standardize how metrics are defined so every analysis runs on the same logic, every time.',
    image: cardPreviewImg,
  },
];

const PLAN_TITLE = 'Sales Activity Effectiveness & Deal Velocity Analysis Plan';

/* ------------------------------------------------------------------ */
/*  Plan data — v1 steps                                               */
/* ------------------------------------------------------------------ */

const PLAN_STEPS_V1 = [
  {
    title: 'Extract all closed won opportunities from the last 2 years with their sales cycle metrics',
    requirements: [
      [
        { text: 'Query the ' },
        { text: 'salesforce_opportunities', tag: true },
        { text: ' table to retrieve opportunities closed in the last 2 years' },
      ],
      [
        { text: 'Filter for won opportunities where ' },
        { text: 'Is_Won', tag: true },
        { text: ' = 1' },
      ],
      [
        { text: 'Calculate sales cycle length as the difference in days between ' },
        { text: 'Close_Date', tag: true },
        { text: ' and ' },
        { text: 'Created_Date', tag: true },
      ],
      [
        { text: 'Include key opportunity information: ' },
        { text: 'Opportunity_ID', tag: true },
        { text: ' , ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Account_Id', tag: true },
        { text: ' , ' },
        { text: 'Amount', tag: true },
        { text: ' , ' },
        { text: 'Created_Date', tag: true },
        { text: ' , ' },
        { text: 'Close_Date', tag: true },
      ],
      [
        { text: 'Perform LEFT JOIN with ' },
        { text: 'salesforce_account', tag: true },
        { text: ' on ' },
        { text: 'Account_Id', tag: true },
        { text: ' = ' },
        { text: 'Id', tag: true },
        { text: ' to get account context' },
      ],
      [
        { text: 'Include account information: ' },
        { text: 'Name', tag: true },
      ],
      [
        { text: 'Exclude opportunities where ' },
        { text: 'Created_Date', tag: true },
        { text: ' or ' },
        { text: 'Close_Date', tag: true },
        { text: ' is null to ensure accurate sales sales cycle calculations' },
      ],
      [
        { text: 'Sort results by ' },
        { text: 'ID', tag: true },
        { text: ' in ascending order' },
      ],
    ],
    tables: ['salesforce_opportunities', 'salesforce_accounts'],
    definitions: [
      { term: 'Opportunities Won:', desc: 'Opportunities Won represent deals that have been successfully closed and marked as won in the sales pipeline' },
      { term: 'Sales Cycle Length:', desc: 'A key performance metric that measures the number of days it takes to close opportunities from creation to closure' },
    ],
  },
  {
    title: 'Extract all completed sales activities (tasks) associated with the won opportunities',
    requirements: [
      [
        { text: 'Join ' },
        { text: 'salesforce_tasks', tag: true },
        { text: ' with the won opportunities from Step 1 where Related To ID ' },
        { text: 'What_ID', tag: true },
      ],
      [
        { text: 'matches Opportunity ID ' },
        { text: 'Id', tag: true },
        { text: ' from Step 1' },
      ],
      [
        { text: 'Filter for completed tasks only where ' },
        { text: 'Status', tag: true },
        { text: " = 'Completed'" },
      ],
      [
        { text: 'Include task details: ' },
        { text: 'Id', tag: true },
        { text: ' , ' },
        { text: 'WhatId', tag: true },
        { text: ' , ' },
        { text: 'Subject', tag: true },
        { text: ' , ' },
        { text: 'Type', tag: true },
        { text: ' , ' },
        { text: 'Call_Type', tag: true },
        { text: ' , ' },
        { text: 'Description', tag: true },
        { text: ' , ' },
        { text: 'Activity_Date', tag: true },
      ],
      [{ text: 'Categorize activities into touch types: Email, Calls, Meetings, Others with detailed subcategories' }],
      [{ text: 'Ensure activities fall within the opportunity lifecycle period' }],
      [
        { text: 'Include the calculated sales cycle length, ' },
        { text: 'Id', tag: true },
        { text: ' , ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Amount', tag: true },
        { text: ' and ' },
        { text: 'Name', tag: true },
        { text: ' from step 1' },
      ],
    ],
    tables: ['salesforce_tasks', ', step 1 output'],
    definitions: [
      { term: 'Sales Touches per Opportunity:', desc: 'The Touchpoint Summary provides a breakdown of all sales interactions across different communication channels' },
    ],
  },
  {
    title: 'Calculate total activity counts per opportunity and identify high activity deals',
    requirements: [
      [
        { text: 'Group activities from Step 2 by ' },
        { text: 'Id', tag: true },
      ],
      [
        { text: 'Count total activities per opportunity across all touch types and store as ' },
        { text: 'total_activities', tag: true },
      ],
      [
        { text: 'Count activities by touch type category: ' },
        { text: 'email_count', tag: true },
        { text: ' , ' },
        { text: 'call_count', tag: true },
        { text: ' , ' },
        { text: 'meeting_count', tag: true },
        { text: ' , ' },
        { text: 'other_count', tag: true },
      ],
      [
        { text: 'Calculate subcategory counts: ' },
        { text: 'inbound_emails', tag: true },
        { text: ' , ' },
        { text: 'outbound_emails', tag: true },
        { text: ' , ' },
        { text: 'inbound_calls', tag: true },
        { text: ' , ' },
        { text: 'outbound_calls', tag: true },
        { text: ' , ' },
        { text: 'scheduled_calls', tag: true },
        { text: ' , ' },
      ],
      [
        { text: '' },
        { text: 'scheduled_meetings', tag: true },
      ],
      [
        { text: 'Include sales cycle length, ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Amount', tag: true },
        { text: ' and ' },
        { text: 'account_name', tag: true },
        { text: ' from step 2.' },
      ],
      [
        { text: 'Filter for high activity deals where ' },
        { text: 'total_activities', tag: true },
        { text: ' >=31' },
      ],
      [{ text: 'Retain only high activity deals for further analysis' }],
    ],
    tables: ['Step 1 output'],
    definitions: [
      { term: 'Sales Touches per Opportunity:', desc: 'Breakdown of all sales interactions across different communication channels' },
    ],
  },
  {
    title: 'Analyze high activity deals to determine which activity types contribute most to faster deal closure',
    requirements: [
      [
        { text: 'Use only high activity deals ' },
        { text: 'total_activities', tag: true },
        { text: ' >= 31) from Step 3' },
      ],
      [{ text: 'Calculate average sales cycle length across all high activity deals' }],
      [
        { text: 'Calculate percentage contribution of each activity type ' },
        { text: 'email_count', tag: true },
        { text: ' , ' },
        { text: 'call_count', tag: true },
        { text: ' , ' },
        { text: 'meeting_count', tag: true },
        { text: ' , ' },
        { text: 'other_count', tag: true },
      ],
      [{ text: 'Identify most common activity type combinations' }],
      [{ text: 'Compare sales cycle length values across different activity type distributions' }],
      [{ text: 'Determine correlation between each activity type count and sales cycle length' }],
      [{ text: 'Rank activity types by effectiveness (inverse relationship with cycle length)' }],
      [{ text: 'Provide insights on optimal activity mix and frequency patterns for high activity deals' }],
    ],
    tables: ['step 3 output'],
    definitions: [
      { term: 'Sales Cycle Length:', desc: 'Number of days to close opportunities from creation to closure' },
      { term: 'Average Sales Cycle Length:', desc: 'Mean duration of the sales process' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Plan data — v2 steps (after applying modifications)                */
/* ------------------------------------------------------------------ */

const PLAN_STEPS_V2 = [
  {
    title: 'Extract all closed won enterprise opportunities from the last 2 years with their sales cycle metrics',
    requirements: [
      [
        { text: 'Query the ' },
        { text: 'salesforce_opportunities', tag: true },
        { text: ' table to retrieve opportunities closed in the last 2 years' },
      ],
      [
        { text: 'Filter for won opportunities where ' },
        { text: 'Is_Won', tag: true },
        { text: ' = 1' },
      ],
      [
        { text: 'Filter for enterprise accounts where ' },
        { text: 'Account Segment', tag: true },
        { text: ' = Enterprise' },
      ],
      [
        { text: 'Calculate sales cycle length as the difference in days between  ' },
        { text: 'Close Date', tag: true },
        { text: ' and ' },
        { text: 'Created Date', tag: true },
      ],
      [
        { text: 'Include key opportunity information: ' },
        { text: 'Opportunity_ID', tag: true },
        { text: ' , ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Account_Id', tag: true },
        { text: ' , ' },
        { text: 'Deal Value', tag: true },
        { text: ' , ' },
        { text: 'Created_Date', tag: true },
        { text: ' , ' },
        { text: 'Close_Date', tag: true },
      ],
      [
        { text: 'Perform LEFT JOIN with ' },
        { text: 'salesforce account', tag: true },
        { text: ' on ' },
        { text: 'Account Id', tag: true },
        { text: ' = ' },
        { text: 'Id', tag: true },
        { text: ' to get account context' },
      ],
      [
        { text: 'Include account information: ' },
        { text: 'Name', tag: true },
      ],
      [
        { text: 'Exclude opportunities where ' },
        { text: 'Created_Date', tag: true },
        { text: ' or ' },
        { text: 'Close_Date', tag: true },
        { text: ' is null to ensure accurate sales  sales cycle calculations' },
      ],
      [
        { text: 'Exclude opportunities where ' },
        { text: 'Amount', tag: true },
        { text: ' is null' },
      ],
      [
        { text: 'Sort results by ' },
        { text: 'Close Date', tag: true },
        { text: ' in ascending order' },
      ],
    ],
    tables: ['salesforce_opportunities', 'salesforce_accounts'],
    definitions: [
      { term: 'Opportunities Won:', desc: 'Opportunities Won represent deals that have been successfully closed and marked as won in the sales pipeline' },
      { term: 'Sales Cycle Length:', desc: 'A key performance metric that measures the number of days it takes to close opportunities from creation to closure' },
    ],
  },
  {
    title: 'Extract all completed sales activities (tasks) associated with the won opportunities',
    requirements: [
      [
        { text: 'Join ' },
        { text: 'salesforce_tasks', tag: true },
        { text: ' with the won opportunities from Step 1 where Related To ID ' },
        { text: 'What ID', tag: true },
      ],
      [
        { text: 'matches Opportunity ID ' },
        { text: 'Id', tag: true },
        { text: ' from Step 1' },
      ],
      [
        { text: 'Filter for completed tasks only where ' },
        { text: 'Status', tag: true },
        { text: " = 'Completed'" },
      ],
      [
        { text: 'Include task details: ' },
        { text: 'Id', tag: true },
        { text: ' , ' },
        { text: 'WhatId', tag: true },
        { text: ' , ' },
        { text: 'Subject', tag: true },
        { text: ' , ' },
        { text: 'Type', tag: true },
        { text: ' , ' },
        { text: 'Call_Type', tag: true },
        { text: ' , ' },
        { text: 'Description', tag: true },
        { text: ' , ' },
        { text: 'Activity_Date', tag: true },
      ],
      [{ text: 'Categorize activities into touch types: Email, Calls, Meetings, Others with detailed subcategories' }],
      [{ text: 'Ensure activities fall within the opportunity lifecycle period' }],
      [
        { text: 'Include the calculated sales cycle length, ' },
        { text: 'Id', tag: true },
        { text: ' , ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Amount', tag: true },
        { text: ' and ' },
        { text: 'Name', tag: true },
        { text: ' from step 1' },
      ],
    ],
    tables: ['salesforce_tasks', ', step 1 output'],
    definitions: [
      { term: 'Sales Touches per Opportunity:', desc: 'The Touchpoint Summary provides a breakdown of all sales interactions across different communication channels' },
    ],
  },
  {
    title: 'Calculate total activity counts per opportunity and identify high activity deals',
    requirements: [
      [
        { text: 'Group activities from Step 2 by ' },
        { text: 'Id', tag: true },
      ],
      [
        { text: 'Count total activities per opportunity across all touch types and store as ' },
        { text: 'total_activities', tag: true },
      ],
      [
        { text: 'Count activities by touch type category: ' },
        { text: 'email_count', tag: true },
        { text: ' , ' },
        { text: 'call_count', tag: true },
        { text: ' , ' },
        { text: 'meeting_count', tag: true },
        { text: ' , ' },
        { text: 'other_count', tag: true },
      ],
      [
        { text: 'Calculate subcategory counts: ' },
        { text: 'inbound_emails', tag: true },
        { text: ' , ' },
        { text: 'outbound_emails', tag: true },
        { text: ' , ' },
        { text: 'inbound_calls', tag: true },
        { text: ' , ' },
        { text: 'outbound_calls', tag: true },
        { text: ' , ' },
        { text: 'scheduled_calls', tag: true },
        { text: ' , ' },
      ],
      [
        { text: '' },
        { text: 'scheduled_meetings', tag: true },
      ],
      [
        { text: 'Include sales cycle length, ' },
        { text: 'Name', tag: true },
        { text: ' , ' },
        { text: 'Amount', tag: true },
        { text: ' and ' },
        { text: 'account_name', tag: true },
        { text: ' from step 2.' },
      ],
      [
        { text: 'Filter for high activity deals where ' },
        { text: 'total_activities', tag: true },
        { text: ' >=31' },
      ],
      [{ text: 'Retain only high activity deals for further analysis' }],
    ],
    tables: ['Step 1 output'],
    definitions: [
      { term: 'Sales Touches per Opportunity:', desc: 'Breakdown of all sales interactions across different communication channels' },
    ],
  },
  {
    title: 'Analyze high activity deals to determine which activity types contribute most to faster deal closure',
    requirements: [
      [
        { text: 'Use only high activity deals ' },
        { text: 'total_activities', tag: true },
        { text: ' >= 31) from Step 3' },
      ],
      [{ text: 'Calculate average sales cycle length across all high activity deals' }],
      [
        { text: 'Calculate percentage contribution of each activity type ' },
        { text: 'email_count', tag: true },
        { text: ' , ' },
        { text: 'call_count', tag: true },
        { text: ' , ' },
        { text: 'meeting_count', tag: true },
        { text: ' , ' },
        { text: 'other_count', tag: true },
      ],
      [{ text: 'Identify most common activity type combinations' }],
      [{ text: 'Compare sales cycle length values across different activity type distributions' }],
      [{ text: 'Determine correlation between each activity type count and sales cycle length' }],
      [{ text: 'Rank activity types by effectiveness (inverse relationship with cycle length)' }],
      [{ text: 'Provide insights on optimal activity mix and frequency patterns for high activity deals' }],
    ],
    tables: ['step 3 output'],
    definitions: [
      { term: 'Sales Cycle Length:', desc: 'Number of days to close opportunities from creation to closure' },
      { term: 'Average Sales Cycle Length:', desc: 'Mean duration of the sales process' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Analysis data                                                      */
/* ------------------------------------------------------------------ */

const ANALYSIS_TITLE = 'Deal Closing Activities';

/* ------------------------------------------------------------------ */
/*  Chart data                                                          */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-3)',
  'var(--color-chart-5)',
];

/* Pool of chart templates — randomly combined per query */
const CHART_POOL = {
  pie: [
    {
      title: 'Sales Activity Effectiveness',
      data: [
        { name: '0–10 Activities - 25% of total sales cycle time', value: 25, colorIndex: 0 },
        { name: '11–30 Activities - 35% of total sales cycle time', value: 35, colorIndex: 1 },
        { name: '31+ Activities - 40% of total sales cycle time', value: 40, colorIndex: 2 },
      ],
    },
    {
      title: 'Revenue by Channel',
      data: [
        { name: 'Direct Sales - 45% of total revenue', value: 45, colorIndex: 0 },
        { name: 'Partner Channel - 30% of total revenue', value: 30, colorIndex: 1 },
        { name: 'Online Self-Serve - 25% of total revenue', value: 25, colorIndex: 2 },
      ],
    },
    {
      title: 'Deal Stage Distribution',
      data: [
        { name: 'Prospecting - 40% of pipeline', value: 40, colorIndex: 0 },
        { name: 'Negotiation - 35% of pipeline', value: 35, colorIndex: 1 },
        { name: 'Closed Won - 25% of pipeline', value: 25, colorIndex: 2 },
      ],
    },
    {
      title: 'Customer Churn by Segment',
      data: [
        { name: 'Enterprise - 10% churn rate', value: 10, colorIndex: 0 },
        { name: 'Mid-Market - 22% churn rate', value: 22, colorIndex: 1 },
        { name: 'SMB - 68% churn rate', value: 68, colorIndex: 2 },
      ],
    },
    {
      title: 'Lead Source Breakdown',
      data: [
        { name: 'Inbound Marketing - 50% of leads', value: 50, colorIndex: 0 },
        { name: 'Outbound Prospecting - 30% of leads', value: 30, colorIndex: 1 },
        { name: 'Referrals - 20% of leads', value: 20, colorIndex: 2 },
      ],
    },
  ],
  bar: [
    {
      title: 'Average Account Health Score by Account Segment',
      data: [
        { segment: 'Enterprise', score: 88 },
        { segment: 'Mid-Market', score: 83 },
        { segment: 'SMB', score: 95 },
      ],
      yLabel: 'Account Health Score',
      xLabel: 'Account Segment',
    },
    {
      title: 'Average Deal Size by Region',
      data: [
        { segment: 'North America', score: 72 },
        { segment: 'EMEA', score: 58 },
        { segment: 'APAC', score: 45 },
      ],
      yLabel: 'Deal Size ($K)',
      xLabel: 'Region',
    },
    {
      title: 'Conversion Rate by Sales Rep',
      data: [
        { segment: 'Team A', score: 34 },
        { segment: 'Team B', score: 52 },
        { segment: 'Team C', score: 41 },
        { segment: 'Team D', score: 67 },
      ],
      yLabel: 'Conversion Rate (%)',
      xLabel: 'Sales Team',
    },
    {
      title: 'Monthly Recurring Revenue by Quarter',
      data: [
        { segment: 'Q1', score: 62 },
        { segment: 'Q2', score: 78 },
        { segment: 'Q3', score: 85 },
        { segment: 'Q4', score: 93 },
      ],
      yLabel: 'MRR Growth (%)',
      xLabel: 'Quarter',
    },
    {
      title: 'Customer Satisfaction Score by Product',
      data: [
        { segment: 'Analytics', score: 91 },
        { segment: 'CRM', score: 76 },
        { segment: 'Marketing', score: 84 },
      ],
      yLabel: 'CSAT Score',
      xLabel: 'Product Line',
    },
  ],
};

/* Simple hash from a string to get a deterministic-ish seed */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* Pick a random title based on the query */
const CHART_TITLES = [
  'Activity Impact Overview',
  'Pipeline Performance Summary',
  'Revenue Analysis Dashboard',
  'Sales Velocity Insights',
  'Growth Metrics Overview',
  'Account Health Dashboard',
  'Conversion Funnel Analysis',
  'Team Performance Breakdown',
];

function generateChartSections(query) {
  const seed = hashStr(query + Date.now().toString());
  const piePool = CHART_POOL.pie;
  const barPool = CHART_POOL.bar;

  /* Decide how many charts: 1-3, biased towards 2 */
  const countRoll = seed % 10;
  const chartCount = countRoll < 2 ? 1 : countRoll < 8 ? 2 : 3;

  /* Pick chart types */
  const types = ['pie', 'bar'];
  const sections = [];
  for (let i = 0; i < chartCount; i++) {
    const typeIdx = (seed + i * 7) % types.length;
    const type = types[typeIdx];
    const pool = type === 'pie' ? piePool : barPool;
    const dataIdx = (seed + i * 13) % pool.length;
    sections.push({ ...pool[dataIdx], type });
  }

  const titleIdx = seed % CHART_TITLES.length;
  return { title: CHART_TITLES[titleIdx], sections };
}

const ANALYSIS_STEPS = [
  'Closed Won Opportunities With Metrics',
  'Completed Sales Activities',
  'Activity Effectiveness Analysis',
  'Impactful Activity Patterns Analysis',
  'Segment Activity Effectiveness by Deal Size',
];

const ANALYSIS_STEP_TIMESTAMPS = [
  'Aug 4, 2025, 07:00 AM UTC',
  'Aug 4, 2025, 07:02 AM UTC',
  'Aug 4, 2025, 07:05 AM UTC',
  'Aug 4, 2025, 07:08 AM UTC',
  'Aug 4, 2025, 07:12 AM UTC',
];

const STEP_1_COLUMNS = [
  '#', 'Metric', 'Value', 'Analysis Type', 'Opportunity created date',
];

const STEP_1_ROWS = [
  ['1', 'Total Opportunities Analyzed', '211', 'Summary', '2023-05-02 06:24:26'],
  ['2', 'Average Sales Cycle Length (All)', '73.57', 'Summary', '2023-05-05 12:29:12'],
  ['3', 'Total Activities Analyzed', '9326', 'Summary', '2023-05-05 14:01:31'],
  ['4', 'Most Effective Activity Type', 'Email', 'Summary', '2023-05-08 16:18:44'],
  ['5', 'Least Effective Activity Type', 'Others', 'Summary', '2023-05-11 05:36:34'],
  ['6', 'Low Activity Avg Cycle Length', '43.33', 'Summary', '2023-05-11 07:58:45'],
  ['7', 'Medium Activity Avg Cycle Length', '61.91', 'Summary', '2023-05-17 09:58:54'],
  ['8', 'High Activity Avg Cycle Length', '100.09', 'Summary', '2023-05-17 11:06:17'],
  ['9', '', '', 'Volume Analysis', '2022-03-08 19:24:59'],
  ['10', '', '', 'Volume Analysis', '2023-05-23 07:28:14'],
];
const STEP_1_COUNT = 226;

const STEP_2_COLUMNS = [
  '#', 'Task activity id', 'Task related to id', 'Task subject',
  'Opportunity created date', 'Account Health Score',
];

const STEP_2_ROWS = [
  ['1', '00TOX00000UjIA82AJ', '006OX000003QAjbYAG', 'Review Team Training by End of Day #168590', '2023-05-02 06:24:26', '68'],
  ['2', '00TOX00000UjIAD2AN', '006OX000003QAkPYAW', 'Schedule Customer Follow-up Call #168591', '2023-05-05 12:29:12', '56'],
  ['3', '00TOX00000UjIAI2AN', '006OX000003QAlEYAW', 'Prepare Quarterly Report Slides #168592', '2023-05-05 14:01:31', '83'],
  ['4', '00TOX00000UjIAN2AN', '006OX000003QAmTYAW', 'Update CRM Entries for New Leads #168593', '2023-05-08 16:18:44', '29'],
  ['5', '00TOX00000UjIAS2AN', '006OX000003QAnIYAW', 'Complete Compliance Training Module #168594', '2023-05-11 05:36:34', '38'],
  ['6', '00TOX00000UjIAX2AN', '006OX000003QAo8YAG', 'Draft Proposal for Enterprise Client #168595', '2023-05-11 07:58:45', '91'],
  ['7', '00TOX00000UjIAc2AN', '006OX000003QApXYAW', 'Conduct Product Demo Session #168596', '2023-05-17 09:58:54', '45'],
  ['8', '00TOX00000UjIAh2AN', '006OX000003QAqMYAW', 'Finalize Contract Terms with Legal #168597', '2023-05-17 11:06:17', '72'],
  ['9', '00TOX00000UjIAm2AN', '006OX000003QArBYAW', 'Send Partnership Renewal Notice #168598', '2022-03-08 19:24:59', '64'],
  ['10', '00TOX00000UjIAr2AN', '006OX000003QAs1YAG', 'Organize Team Building Activity #168599', '2023-05-23 07:28:14', '17'],
];
const STEP_2_COUNT = 9326;

/* Step 3 reuses step 1 structure (Activity Effectiveness Analysis) */

const STEP_4_COLUMNS = [
  '#', 'Analysis category', 'Metric', 'Analysis Type', 'Opportunity created date',
];

const STEP_4_ROWS = [
  ['1', 'Stage Distribution', 'Calls in Early Stage', '34', '2023-05-02 06:24:26'],
  ['2', 'Stage Distribution', 'Email in Early Stage', '20', '2023-05-05 12:29:12'],
  ['3', 'Stage Distribution', 'Meetings in Early Stage', '176', '2023-05-05 14:01:31'],
  ['4', 'Stage Distribution', 'Others in Early Stage', '4791', '2023-05-08 16:18:44'],
  ['5', 'Stage Distribution', 'Calls in Late Stage', '34', '2023-05-11 05:36:34'],
  ['6', 'Stage Distribution', 'Meetings in Late Stage', '72', '2023-05-11 07:58:45'],
  ['7', 'Stage Distribution', 'Others in Late Stage', '2069', '2023-05-17 09:58:54'],
  ['8', 'Stage Distribution', 'Calls in Middle Stage', '20', '2023-05-17 11:06:17'],
  ['9', 'Stage Distribution', 'Email in Middle Stage', '1', '2022-03-08 19:24:59'],
  ['10', 'Stage Distribution', 'Meetings in Middle Stage', '110', '2023-05-23 07:28:14'],
];
const STEP_4_COUNT = 86;

const STEP_5_COLUMNS = [
  '#', 'Deal Size', 'Email %', 'Call %', 'Meeting %', 'Avg Touches', 'Fastest Cycle',
];

const STEP_5_ROWS = [
  ['1', 'Small', '62', '28', '10', '9', '16'],
  ['2', 'Mid', '38', '34', '28', '13', '39'],
  ['3', 'Large', '22', '26', '52', '24', '82'],
];
const STEP_5_COUNT = 3;

/* Per-step data lookup */
const STEP_DATA = [
  { columns: STEP_1_COLUMNS, rows: STEP_1_ROWS, count: STEP_1_COUNT },
  { columns: STEP_2_COLUMNS, rows: STEP_2_ROWS, count: STEP_2_COUNT },
  { columns: STEP_1_COLUMNS, rows: STEP_1_ROWS, count: STEP_1_COUNT },
  { columns: STEP_4_COLUMNS, rows: STEP_4_ROWS, count: STEP_4_COUNT },
  { columns: STEP_5_COLUMNS, rows: STEP_5_ROWS, count: STEP_5_COUNT },
];

/* ------------------------------------------------------------------ */
/*  Modification bubble — shown on modified lines                      */
/* ------------------------------------------------------------------ */

function ModificationBubble({ modification, initials = 'AD' }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const { editModification, deleteModification, addModification } = useContext(ModifyContext);
  const bubbleRef = useRef(null);
  const menuRef = useRef(null);
  const editInputRef = useRef(null);

  /* Close popover on outside click */
  useEffect(() => {
    if (!popoverOpen && !editMode) return;
    function handleClick(e) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setPopoverOpen(false);
        setMenuOpen(false);
        setEditMode(false);
        setEditValue('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpen, editMode]);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  /* Focus edit textarea */
  useEffect(() => {
    if (editMode && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editMode]);

  function handleEdit() {
    setEditMode(true);
    setEditValue('');
    setMenuOpen(false);
    setPopoverOpen(false);
  }

  function handleEditSubmit() {
    if (editValue.trim()) {
      addModification(editValue.trim(), modification.source);
    }
    setEditMode(false);
    setEditValue('');
  }

  function handleClose() {
    setEditMode(false);
    setEditValue('');
  }

  function handleDelete() {
    deleteModification(modification.id);
    setMenuOpen(false);
    setPopoverOpen(false);
  }

  /* Edit mode — full inline panel */
  if (editMode) {
    return (
      <div className="wbc__mod-bubble-wrapper" ref={bubbleRef}>
        <div className="wbc__mod-edit-panel">
          {/* Header */}
          <div className="wbc__mod-edit-panel-header">
            <div className="wbc__mod-edit-panel-title">
              <PencilSimpleLine size={16} weight="regular" color="var(--color-neutral-600)" />
              <span className="text-body-1-regular wbc__mod-edit-panel-label">Modify</span>
            </div>
            <button
              className="wbc__modify-step-close"
              type="button"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={12} weight="regular" />
            </button>
          </div>

          {/* Previous modification thread */}
          <div className="wbc__mod-edit-panel-thread">
            <div className="wbc__mod-edit-panel-msg">
              <div className="wbc__mod-popover-avatar">
                <span className="text-metadata-regular">{initials}</span>
              </div>
              <p className="text-body-1-regular wbc__mod-edit-panel-msg-text">{modification.text}</p>
            </div>
            <div className="wbc__mod-popover-added">
              <CheckCircle size={16} weight="fill" color="var(--color-primary-500)" />
              <span className="text-body-1-regular wbc__mod-popover-added-text">Added</span>
            </div>
          </div>

          {/* New input */}
          <div className="wbc__modify-step-dropdown-body">
            <div className="wbc__modify-step-box">
              <textarea
                ref={editInputRef}
                className="wbc__modify-step-textarea text-body-1-regular"
                placeholder="What would you like to modify?"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                  if (e.key === 'Escape') handleClose();
                }}
                rows={2}
              />
              <div className="wbc__modify-step-actions">
                <button
                  className={`wbc__modify-step-submit ${editValue.trim() ? 'wbc__modify-step-submit--active' : ''}`}
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={!editValue.trim()}
                  aria-label="Submit"
                >
                  <ArrowUp
                    size={12}
                    weight="bold"
                    color={editValue.trim() ? 'var(--color-white)' : 'var(--color-neutral-300)'}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Default — bubble + hover popover */
  return (
    <div className="wbc__mod-bubble-wrapper" ref={bubbleRef}>
      <button
        className="wbc__mod-bubble"
        type="button"
        onMouseEnter={() => setPopoverOpen(true)}
        onMouseLeave={() => { if (!menuOpen) setPopoverOpen(false); }}
        onClick={() => setPopoverOpen(!popoverOpen)}
        aria-label="View modification"
      >
        <ChatTeardropText size={16} weight="regular" color="var(--color-primary-500)" />
      </button>

      {popoverOpen && (
        <div
          className="wbc__mod-popover"
          onMouseEnter={() => setPopoverOpen(true)}
          onMouseLeave={() => { if (!menuOpen) setPopoverOpen(false); }}
        >
          <div className="wbc__mod-popover-header">
            <span className="text-body-2-medium wbc__mod-popover-title">Modification</span>
            <div className="wbc__mod-popover-menu-wrapper" ref={menuRef}>
              <button
                className="wbc__mod-popover-menu-btn"
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="More options"
              >
                <DotsThree size={16} weight="bold" color="var(--color-neutral-600)" />
              </button>
              {menuOpen && (
                <div className="wbc__mod-popover-dropdown">
                  <button className="wbc__mod-popover-action" type="button" onClick={handleEdit}>
                    <PencilSimple size={12} weight="regular" color="var(--color-text-primary)" />
                    <span className="text-body-2-regular">Edit</span>
                  </button>
                  <button className="wbc__mod-popover-action" type="button" onClick={handleDelete}>
                    <TrashSimple size={12} weight="regular" color="var(--color-text-primary)" />
                    <span className="text-body-2-regular">Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="wbc__mod-popover-body">
            <div className="wbc__mod-popover-avatar">
              <span className="text-metadata-regular">{initials}</span>
            </div>
            <p className="text-body-2-regular wbc__mod-popover-text">{modification.text}</p>
          </div>
          <div className="wbc__mod-popover-added">
            <CheckCircle size={16} weight="fill" color="var(--color-primary-500)" />
            <span className="text-body-1-regular wbc__mod-popover-added-text">Added</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Requirement line renderer                                          */
/* ------------------------------------------------------------------ */

function RequirementLine({ segments, modifyId, diffType }) {
  const [hovered, setHovered] = useState(false);
  const [modifyValue, setModifyValue] = useState('');
  const inputRef = useRef(null);
  const { activeModifyId, setActiveModifyId, modifications, addModification, isViewingOldVersion } = useContext(ModifyContext);
  const editing = activeModifyId === modifyId;
  const lineMod = modifications.find((m) => m.source === modifyId);

  const setEditing = useCallback((val) => {
    setActiveModifyId(val ? modifyId : null);
  }, [modifyId, setActiveModifyId]);

  useEffect(() => {
    if (!editing) setModifyValue('');
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function handleSubmit() {
    if (modifyValue.trim()) {
      addModification(modifyValue.trim(), modifyId);
      setModifyValue('');
      setEditing(false);
    }
  }

  return (
    <li
      className={`wbc__req-item ${(hovered || editing) && !isViewingOldVersion && !diffType ? 'wbc__req-item--hovered' : ''} ${diffType ? `wbc__diff-line--${diffType}` : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!editing) return; }}
    >
      <div className="wbc__req-item-content">
        <span className="wbc__req-item-text">
          {segments.map((seg, i) =>
            seg.tag ? <PlannerChip key={i} size="lg">{seg.text}</PlannerChip> : <span key={i}>{seg.text}</span>
          )}
        </span>
        {!diffType && lineMod && !editing && !isViewingOldVersion && <ModificationBubble modification={lineMod} />}
        {!diffType && (hovered || editing) && !lineMod && !isViewingOldVersion && (
          <div className="wbc__modify-step-anchor">
            {!editing ? (
              <button
                className="wbc__modify-step-btn"
                type="button"
                onClick={() => setEditing(true)}
              >
                <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
                <span className="text-body-2-regular wbc__modify-step-label">Modify Step</span>
              </button>
            ) : (
              <div className="wbc__modify-step-dropdown">
                <div className="wbc__modify-step-dropdown-header">
                  <div className="wbc__modify-step-dropdown-title">
                    <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
                    <span className="text-body-2-regular">Modify Step</span>
                  </div>
                  <button
                    className="wbc__modify-step-close"
                    type="button"
                    onClick={() => { setEditing(false); setModifyValue(''); }}
                    aria-label="Close"
                  >
                    <X size={12} weight="regular" />
                  </button>
                </div>
                <div className="wbc__modify-step-dropdown-body">
                  <div className="wbc__modify-step-box">
                    <textarea
                      ref={inputRef}
                      className="wbc__modify-step-textarea text-body-1-regular"
                      placeholder="What would you like to modify? Use # to tag columns or definitions."
                      value={modifyValue}
                      onChange={(e) => setModifyValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                        if (e.key === 'Escape') { setEditing(false); setModifyValue(''); }
                      }}
                      rows={3}
                    />
                    <div className="wbc__modify-step-actions">
                      <button
                        className={`wbc__modify-step-submit ${modifyValue.trim() ? 'wbc__modify-step-submit--active' : ''}`}
                        type="button"
                        onClick={handleSubmit}
                        disabled={!modifyValue.trim()}
                        aria-label="Submit"
                      >
                        <ArrowUp
                          size={12}
                          weight="bold"
                          color={modifyValue.trim() ? 'var(--color-white)' : 'var(--color-neutral-300)'}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Single plan step                                                    */
/* ------------------------------------------------------------------ */

function PlanStep({ index, step, diff }) {
  const [headerHovered, setHeaderHovered] = useState(false);
  const [headerModifyValue, setHeaderModifyValue] = useState('');
  const headerInputRef = useRef(null);
  const { activeModifyId, setActiveModifyId, modifications, addModification, isViewingOldVersion } = useContext(ModifyContext);
  const headerModifyId = `step-header-${index}`;
  const headerEditing = activeModifyId === headerModifyId;
  const headerMod = modifications.find((m) => m.source === headerModifyId);

  const setHeaderEditing = useCallback((val) => {
    setActiveModifyId(val ? headerModifyId : null);
  }, [headerModifyId, setActiveModifyId]);

  useEffect(() => {
    if (!headerEditing) setHeaderModifyValue('');
    if (headerEditing && headerInputRef.current) {
      headerInputRef.current.focus();
    }
  }, [headerEditing]);

  const handleHeaderModifySubmit = () => {
    if (headerModifyValue.trim()) {
      addModification(headerModifyValue.trim(), headerModifyId);
    }
    setHeaderEditing(false);
    setHeaderModifyValue('');
  };

  return (
    <div className="wbc__step">
      {/* If diff shows title changed, render old (removed) header first */}
      {diff?.titleChanged && (
        <div className="wbc__step-header wbc__diff-header--removed">
          <span className="wbc__step-label">Step {index + 1}:</span>
          <span className="wbc__step-title">{diff.oldTitle}</span>
        </div>
      )}
      <div
        className={`wbc__step-header ${headerHovered && !isViewingOldVersion && !diff ? 'wbc__step-header--hovered' : ''} ${diff?.titleChanged ? 'wbc__diff-header--added' : ''}`}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <span className="wbc__step-label">Step {index + 1}:</span>
        <span className="wbc__step-title">{step.title}</span>
        {!diff && headerMod && !headerEditing && !isViewingOldVersion && <ModificationBubble modification={headerMod} />}
        {!diff && (headerHovered || headerEditing) && !headerMod && !isViewingOldVersion && (
          <div className="wbc__modify-step-anchor">
            {!headerEditing ? (
              <button
                className="wbc__modify-step-btn"
                type="button"
                onClick={() => setHeaderEditing(true)}
              >
                <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
                <span className="text-body-2-regular wbc__modify-step-label">Modify Step</span>
              </button>
            ) : (
              <div className="wbc__modify-step-dropdown">
                <div className="wbc__modify-step-dropdown-header">
                  <div className="wbc__modify-step-dropdown-title">
                    <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
                    <span className="text-body-2-regular">Modify Step</span>
                  </div>
                  <button
                    className="wbc__modify-step-close"
                    type="button"
                    onClick={() => { setHeaderEditing(false); setHeaderModifyValue(''); }}
                    aria-label="Close"
                  >
                    <X size={12} weight="regular" />
                  </button>
                </div>
                <div className="wbc__modify-step-dropdown-body">
                  <div className="wbc__modify-step-box">
                    <textarea
                      ref={headerInputRef}
                      className="wbc__modify-step-textarea text-body-1-regular"
                      placeholder="What would you like to modify? Use # to tag columns or definitions."
                      value={headerModifyValue}
                      onChange={(e) => setHeaderModifyValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleHeaderModifySubmit(); }
                        if (e.key === 'Escape') { setHeaderEditing(false); setHeaderModifyValue(''); }
                      }}
                      rows={3}
                    />
                    <div className="wbc__modify-step-actions">
                      <button
                        className={`wbc__modify-step-submit ${headerModifyValue.trim() ? 'wbc__modify-step-submit--active' : ''}`}
                        type="button"
                        onClick={handleHeaderModifySubmit}
                        disabled={!headerModifyValue.trim()}
                        aria-label="Submit"
                      >
                        <ArrowUp
                          size={12}
                          weight="bold"
                          color={headerModifyValue.trim() ? 'var(--color-white)' : 'var(--color-neutral-300)'}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="wbc__step-section">
        <div className="wbc__step-section-header">
          <ClipboardText size={16} weight="regular" />
          <span className="wbc__step-section-title">Requirements</span>
        </div>
        <ul className="wbc__req-list">
          {/* In diff mode, show removed lines first */}
          {diff?.removedLines?.map((segments, i) => (
            <RequirementLine key={`removed-${i}`} segments={segments} modifyId="" diffType="removed" />
          ))}
          {step.requirements.map((segments, i) => (
            <RequirementLine
              key={i}
              segments={segments}
              modifyId={diff ? '' : `step-${index}-req-${i}`}
              diffType={diff?.reqDiffs?.[i] || null}
            />
          ))}
        </ul>
      </div>

      {/* Relevant Tables */}
      <div className="wbc__step-section">
        <div className="wbc__step-section-header">
          <Table size={16} weight="regular" />
          <span className="wbc__step-section-title">Relevant Tables</span>
        </div>
        <div className="wbc__step-tables">
          {step.tables.map((t, i) => {
            if (t.startsWith(',')) {
              return <span key={i} className="wbc__step-table-text">{t}</span>;
            }
            if (t.startsWith('salesforce_')) {
              return <PlannerChip key={i} size="lg">{t}</PlannerChip>;
            }
            if (t.startsWith('S') || t.startsWith('s')) {
              return <span key={i} className="wbc__step-table-text">{t}</span>;
            }
            return <PlannerChip key={i}>{t}</PlannerChip>;
          })}
        </div>
      </div>

      {/* Relevant Definitions */}
      <div className="wbc__step-section">
        <div className="wbc__step-section-header">
          <BookOpenText size={16} weight="regular" />
          <span className="wbc__step-section-title">Relevant Definitions</span>
        </div>
        <ul className="wbc__def-list">
          {step.definitions.map((def, i) => (
            <li key={i} className="wbc__def-item">
              <strong>{def.term}</strong> {def.desc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan Content — all steps rendered                                   */
/* ------------------------------------------------------------------ */

function PlanContent() {
  const { viewingVersion } = useContext(ModifyContext);
  const steps = viewingVersion >= 2 ? PLAN_STEPS_V2 : PLAN_STEPS_V1;
  return (
    <div className="wbc__plan-content">
      {steps.map((step, i) => (
        <PlanStep key={`${viewingVersion}-${i}`} index={i} step={step} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan Diff helpers                                                   */
/* ------------------------------------------------------------------ */

function serializeReqLine(segments) {
  return segments.map((s) => (s.tag ? `[${s.text}]` : s.text)).join('');
}

/** Compute diff annotations for a step: which req lines are added/removed/unchanged */
function computeStepDiff(oldStep, newStep) {
  const oldTexts = oldStep.requirements.map(serializeReqLine);
  const newTexts = newStep.requirements.map(serializeReqLine);

  /* Map new lines: if line exists in old, unchanged; otherwise added */
  const usedOld = new Set();
  const reqDiffs = newTexts.map((text, i) => {
    const oldIdx = oldTexts.findIndex((t, j) => t === text && !usedOld.has(j));
    if (oldIdx !== -1) {
      usedOld.add(oldIdx);
      return null; /* unchanged — no annotation */
    }
    return 'added';
  });

  /* Find removed lines (in old but not matched) */
  const removedLines = [];
  oldStep.requirements.forEach((segs, i) => {
    if (!usedOld.has(i)) {
      removedLines.push(segs);
    }
  });

  return {
    titleChanged: oldStep.title !== newStep.title,
    oldTitle: oldStep.title,
    reqDiffs,      /* array parallel to newStep.requirements: null | 'added' */
    removedLines,  /* requirement segments that were removed */
  };
}

function PlanDiffContent() {
  return (
    <div className="wbc__plan-content">
      {PLAN_STEPS_V2.map((newStep, i) => {
        const oldStep = PLAN_STEPS_V1[i] || newStep;
        const diff = computeStepDiff(oldStep, newStep);
        return <PlanStep key={`diff-${i}`} index={i} step={newStep} diff={diff} />;
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card Loader Animation                                              */
/*  Three cards stacked with perspective — the front card is largest    */
/*  and slides up/behind when cycling, while the next card grows        */
/*  smoothly into the front position.                                   */
/* ------------------------------------------------------------------ */

function CardLoaderAnimation({ activeIndex, onPrev, onNext, isPaused, onTogglePause }) {
  return (
    <div className="wbc__card-loader">
      {/* Stacked cards */}
      <div className="wbc__card-stack">
        {TUTORIAL_CARDS.map((card, i) => {
          /* position: 0 = front (largest), 1 = mid, 2 = back (smallest) */
          const position = ((i - activeIndex) % 3 + 3) % 3;

          return (
            <div
              key={i}
              className="wbc__tutorial-card"
              data-position={position}
            >
              <div className="wbc__tutorial-card-img-wrap">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className="wbc__tutorial-card-img"
                  />
                ) : (
                  <div className="wbc__tutorial-card-img-placeholder" />
                )}
              </div>
              <div className="wbc__tutorial-card-body">
                <p className="wbc__tutorial-card-title">{card.title}</p>
                <p className="wbc__tutorial-card-desc">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Left progress indicators */}
      <div className="wbc__card-progress">
        {TUTORIAL_CARDS.map((_, i) => (
          <div
            key={i}
            className={`wbc__card-progress-bar ${i === activeIndex ? 'wbc__card-progress-bar--active' : ''}`}
          />
        ))}
      </div>

      {/* Right controls */}
      <div className="wbc__card-controls">
        <button className="wbc__card-control-btn" onClick={onPrev} aria-label="Previous">
          <CaretUp size={12} weight="regular" />
        </button>
        <button className="wbc__card-control-btn" onClick={onTogglePause} aria-label={isPaused ? 'Play' : 'Pause'}>
          {isPaused ? <Play size={12} weight="regular" /> : <Pause size={12} weight="regular" />}
        </button>
        <button className="wbc__card-control-btn" onClick={onNext} aria-label="Next">
          <CaretDown size={12} weight="regular" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clone icon (custom SVG)                                            */
/* ------------------------------------------------------------------ */

function CloneIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 2H5.5C5.36739 2 5.24021 2.05268 5.14645 2.14645C5.05268 2.24021 5 2.36739 5 2.5V5H2.5C2.36739 5 2.24021 5.05268 2.14645 5.14645C2.05268 5.24021 2 5.36739 2 5.5V13.5C2 13.6326 2.05268 13.7598 2.14645 13.8536C2.24021 13.9473 2.36739 14 2.5 14H10.5C10.6326 14 10.7598 13.9473 10.8536 13.8536C10.9473 13.7598 11 13.6326 11 13.5V11H13.5C13.6326 11 13.7598 10.9473 13.8536 10.8536C13.9473 10.7598 14 10.6326 14 10.5V2.5C14 2.36739 13.9473 2.24021 13.8536 2.14645C13.7598 2.05268 13.6326 2 13.5 2ZM10 13H3V6H10V13ZM13 10H11V5.5C11 5.36739 10.9473 5.24021 10.8536 5.14645C10.7598 5.05268 10.6326 5 10.5 5H6V3H13V10Z" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Card Dots Menu (shared)                                     */
/* ------------------------------------------------------------------ */

function ActionCardDotsMenu({ isLast = false, showClone = true, renameType, renameName = '' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);
  const { openRename } = useContext(ModifyContext);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen(e) {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="wbc__action-card-caret" ref={ref}>
      <button
        type="button"
        className="wbc__action-card-dots-btn"
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Actions"
      >
        <DotsThree size={16} weight="bold" color="var(--color-neutral-600)" />
      </button>
      {open && (
        <div className="wbc__action-card-dropdown" style={{ top: pos.top, left: pos.left }}>
          <button
            type="button"
            className="wbc__action-card-dropdown-item"
            onClick={(e) => { e.stopPropagation(); setOpen(false); if (renameType) openRename(renameType, renameName); }}
          >
            <PencilSimpleLine size={16} weight="regular" color="var(--color-icon-dark)" />
            <span>Rename</span>
          </button>
          {showClone && (
            <button
              type="button"
              className="wbc__action-card-dropdown-item"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            >
              <CloneIcon size={16} color="var(--color-icon-dark)" />
              <span>Clone</span>
            </button>
          )}
          <button
            type="button"
            className={`wbc__action-card-dropdown-item${isLast ? ' wbc__action-card-dropdown-item--danger' : ' wbc__action-card-dropdown-item--disabled'}`}
            disabled={!isLast}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          >
            <TrashSimple size={16} weight="regular" color={isLast ? '#F93D3D' : 'var(--color-neutral-300)'} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guidance Action Card                                               */
/* ------------------------------------------------------------------ */

function GuidanceActionCard({ planReady, onClick, isActive, isLast = false }) {
  const { planVersion } = useContext(ModifyContext);
  return (
    <div
      className={`wbc__action-card ${isActive ? 'wbc__action-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="wbc__action-card-inner">
        <div className="wbc__action-card-icon-frame">
          <div className="wbc__action-card-icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="var(--color-icon-medium)" viewBox="0 0 256 256"><path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64Zm6,70h72a6,6,0,0,0,0-12H40a6,6,0,0,0,0,12Zm88,52H40a6,6,0,0,0,0,12h88a6,6,0,0,0,0-12Zm108.24,10.24a6,6,0,0,1-8.48,0l-21.49-21.48a38.06,38.06,0,1,1,8.49-8.49l21.48,21.49A6,6,0,0,1,236.24,196.24ZM184,170a26,26,0,1,0-26-26A26,26,0,0,0,184,170Z"></path></svg>
          </div>
        </div>

        <div className="wbc__action-card-content">
          <div className="wbc__action-card-meta">
            {planReady ? (
              <CheckCircle size={12} weight="fill" color="var(--color-success)" />
            ) : (
              <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={12} height={12} />
            )}
            <span className="wbc__action-card-meta-text">Plan 1</span>
            <span className="wbc__action-card-meta-sep">|</span>
            <span className="wbc__action-card-meta-text">v{planVersion}</span>
          </div>
          <p className="wbc__action-card-title" title={PLAN_TITLE}>{PLAN_TITLE}</p>
        </div>

        <ActionCardDotsMenu isLast={isLast} showClone={false} renameType="workbook" renameName={PLAN_TITLE} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analysis Action Card — shown in left panel when running            */
/* ------------------------------------------------------------------ */

function AnalysisActionCard({ isActive, onClick, isLast = false }) {
  const { activeAnalysisStep, setActiveAnalysisStep, running, allStepsDone, analysisSource } = useContext(ModifyContext);
  const sourceVersion = analysisSource?.planVersion || 1;

  return (
    <div className={`wbc__action-card ${isActive ? 'wbc__action-card--active' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      {/* Header row — same layout as plan action card */}
      <div className="wbc__action-card-inner">
        <div className="wbc__action-card-icon-frame">
          <div className="wbc__action-card-icon-container">
            <Table size={36} weight="light" color="var(--color-icon-medium)" />
          </div>
        </div>
        <div className="wbc__action-card-content">
          <div className="wbc__action-card-meta">
            {running ? (
              <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={20} height={20} />
            ) : (
              <CheckCircle size={12} weight="fill" color="var(--color-success)" />
            )}
            <span className="wbc__action-card-meta-text">Analysis</span>
            <span className="wbc__info-icon-wrap">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 1.125C5.03582 1.125 4.09329 1.41091 3.2916 1.94659C2.48991 2.48226 1.86507 3.24363 1.49609 4.13442C1.12711 5.02521 1.03057 6.00541 1.21867 6.95107C1.40678 7.89672 1.87108 8.76536 2.55286 9.44715C3.23464 10.1289 4.10328 10.5932 5.04894 10.7813C5.99459 10.9694 6.97479 10.8729 7.86558 10.5039C8.75637 10.1349 9.51774 9.51009 10.0534 8.7084C10.5891 7.90671 10.875 6.96418 10.875 6C10.8736 4.70749 10.3596 3.46831 9.44564 2.55436C8.5317 1.64042 7.29251 1.12636 6 1.125ZM6 10.125C5.18415 10.125 4.38663 9.88307 3.70827 9.42981C3.02992 8.97655 2.50121 8.33231 2.189 7.57857C1.87679 6.82482 1.7951 5.99542 1.95426 5.19525C2.11343 4.39508 2.5063 3.66008 3.08319 3.08318C3.66008 2.50629 4.39508 2.11342 5.19525 1.95426C5.99543 1.7951 6.82483 1.87679 7.57857 2.189C8.33232 2.50121 8.97655 3.02992 9.42981 3.70827C9.88308 4.38663 10.125 5.18415 10.125 6C10.1238 7.09364 9.68877 8.14213 8.91545 8.91545C8.14213 9.68876 7.09364 10.1238 6 10.125ZM6.75 8.25C6.75 8.34946 6.71049 8.44484 6.64017 8.51517C6.56984 8.58549 6.47446 8.625 6.375 8.625C6.17609 8.625 5.98532 8.54598 5.84467 8.40533C5.70402 8.26468 5.625 8.07391 5.625 7.875V6C5.52555 6 5.43016 5.96049 5.35984 5.89016C5.28951 5.81984 5.25 5.72446 5.25 5.625C5.25 5.52554 5.28951 5.43016 5.35984 5.35984C5.43016 5.28951 5.52555 5.25 5.625 5.25C5.82391 5.25 6.01468 5.32902 6.15533 5.46967C6.29598 5.61032 6.375 5.80109 6.375 6V7.875C6.47446 7.875 6.56984 7.91451 6.64017 7.98483C6.71049 8.05516 6.75 8.15054 6.75 8.25ZM5.25 3.9375C5.25 3.82625 5.28299 3.71749 5.3448 3.62499C5.40661 3.53249 5.49446 3.46039 5.59724 3.41782C5.70003 3.37524 5.81313 3.3641 5.92224 3.38581C6.03135 3.40751 6.13158 3.46109 6.21025 3.53975C6.28892 3.61842 6.34249 3.71865 6.36419 3.82776C6.3859 3.93688 6.37476 4.04998 6.33218 4.15276C6.28961 4.25554 6.21751 4.34339 6.12501 4.4052C6.03251 4.46701 5.92375 4.5 5.8125 4.5C5.66332 4.5 5.52024 4.44074 5.41475 4.33525C5.30927 4.22976 5.25 4.08668 5.25 3.9375Z" fill="#52577A"/>
              </svg>
              <span className="wbc__info-tooltip">
                Analysis Initiated from <strong>Plan 1 | v{sourceVersion}</strong>
              </span>
            </span>
          </div>
          <p className="wbc__action-card-title">{ANALYSIS_TITLE}</p>
        </div>
        <ActionCardDotsMenu isLast={isLast} showClone={false} renameType="analysis" renameName={ANALYSIS_TITLE} />
      </div>

      {/* Steps tracker */}
      <div className={`wbc__analysis-steps ${!isActive ? 'wbc__analysis-steps--collapsed' : ''}`}>
        {ANALYSIS_STEPS.map((stepName, i) => {
          const isActive = i === activeAnalysisStep;
          const isDone = allStepsDone || i < activeAnalysisStep;
          const isClickable = allStepsDone;
          return (
            <div key={i} className="wbc__analysis-step-row">
              {i > 0 && <div className="wbc__analysis-step-connector" />}
              <div
                className={`wbc__analysis-step ${isActive ? 'wbc__analysis-step--active' : ''} ${isClickable ? 'wbc__analysis-step--clickable' : ''}`}
                onClick={isClickable ? () => setActiveAnalysisStep(i) : undefined}
              >
                {isActive && running ? (
                  <img src={spinnerGif} alt="Running" className="wbc__spinner-gif" width={16} height={16} />
                ) : isDone ? (
                  <CheckCircle size={16} weight="fill" color="var(--color-primary-500)" />
                ) : (
                  <Circle size={16} weight="regular" color="var(--color-neutral-300)" />
                )}
                <span
                  className={`text-body-2-medium wbc__analysis-step-text ${
                    isActive ? 'wbc__analysis-step-text--active' : isDone ? 'wbc__analysis-step-text--done' : ''
                  }`}
                >
                  Step {i + 1}: {stepName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Memo Action Card (left panel)                                      */
/* ------------------------------------------------------------------ */

function MemoActionCard({ title, isActive, onClick, isLast = false }) {
  return (
    <div
      className={`wbc__action-card ${isActive ? 'wbc__action-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="wbc__action-card-inner">
        <div className="wbc__action-card-icon-frame">
          <div className="wbc__action-card-icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="#757a97" viewBox="0 0 256 256"><path d="M90,96a6,6,0,0,1,6-6h64a6,6,0,0,1,0,12H96A6,6,0,0,1,90,96Zm6,38h64a6,6,0,0,0,0-12H96a6,6,0,0,0,0,12Zm32,20H96a6,6,0,0,0,0,12h32a6,6,0,0,0,0-12ZM222,48V156.69a13.94,13.94,0,0,1-4.1,9.9L166.59,217.9a13.94,13.94,0,0,1-9.9,4.1H48a14,14,0,0,1-14-14V48A14,14,0,0,1,48,34H208A14,14,0,0,1,222,48ZM48,210H154V160a6,6,0,0,1,6-6h50V48a2,2,0,0,0-2-2H48a2,2,0,0,0-2,2V208A2,2,0,0,0,48,210Zm153.52-44H166v35.52Z" /></svg>
          </div>
        </div>
        <div className="wbc__action-card-content">
          <div className="wbc__action-card-meta">
            <CheckCircle size={12} weight="fill" color="var(--color-success)" />
            <span className="wbc__action-card-meta-text">Memo</span>
          </div>
          <p className="wbc__action-card-title" title={title}>{title}</p>
        </div>
        <ActionCardDotsMenu isLast={isLast} renameType="memo" renameName={title} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Text Box (disabled state)                                     */
/* ------------------------------------------------------------------ */

function ChatTextBox({ active = false, analysisReady = false, onGenerateMemo, onCreateChart }) {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('quick-analysis');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef(null);

  const currentMode = ALL_MODES.find((m) => m.id === selectedMode);
  const ModeIcon = currentMode.icon;
  const CREATE_FROM_ANALYSIS_IDS = ['generate-memo', 'create-chart', 'save-as-definition'];

  /* Close mode dropdown on outside click */
  useEffect(() => {
    if (!modeDropdownOpen) return;
    function handleClick(e) {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target)) {
        setModeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modeDropdownOpen]);

  if (!active) {
    return (
      <div className="wbc__textbox">
        <div className="wbc__textbox-inner">
          <div className="wbc__textbox-placeholder">
            <p>Run a quick analysis to answer the following question</p>
            <p>&nbsp;</p>
          </div>
          <div className="wbc__textbox-actions">
            <div className="wbc__textbox-analysis-btn">
              <Play size={12} weight="regular" className="wbc__icon-disabled" />
              <span className="wbc__textbox-analysis-label">Quick Analysis</span>
              <CaretDown size={12} weight="regular" className="wbc__icon-disabled" />
            </div>
            <div className="wbc__textbox-submit-btn">
              <ArrowUp size={12} weight="regular" className="wbc__icon-disabled" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wbc__textbox">
      <div className="wbc__textbox-inner wbc__textbox-inner--active">
        <textarea
          className="wbc__textbox-input"
          placeholder={currentMode.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
        />
        <div className="wbc__textbox-actions">
          <div className="wbc__textbox-mode-wrapper" ref={modeDropdownRef}>
            <button
              type="button"
              className="btn btn--secondary btn--md wbc__textbox-mode-btn"
              onClick={() => setModeDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={modeDropdownOpen}
            >
              <span className="btn__icon">
                <ModeIcon size={16} />
              </span>
              <span>{currentMode.label}</span>
              <span className={`btn__icon wbc__textbox-mode-btn-caret${modeDropdownOpen ? ' wbc__textbox-mode-btn-caret--open' : ''}`}>
                <CaretDown size={16} weight="regular" />
              </span>
            </button>

            {modeDropdownOpen && (
              <div className="wbc__textbox-mode-dropdown" role="menu">
                {ANALYSIS_MODE_GROUPS.map((group, gi) => (
                  <div key={group.label} className="wbc__textbox-mode-group">
                    {gi > 0 && <div className="wbc__textbox-mode-divider" />}
                    <span className="wbc__textbox-mode-group-label">{group.label}</span>
                    {group.modes.map((mode) => {
                      const IconComp = mode.icon;
                      const isSelected = mode.id === selectedMode;
                      const isDisabled = !analysisReady && CREATE_FROM_ANALYSIS_IDS.includes(mode.id);
                      return (
                        <button
                          key={mode.id}
                          className={`wbc__textbox-mode-dropdown-item${isSelected ? ' wbc__textbox-mode-dropdown-item--selected' : ''}${isDisabled ? ' wbc__textbox-mode-dropdown-item--disabled' : ''}`}
                          type="button"
                          role="menuitem"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedMode(mode.id);
                            setModeDropdownOpen(false);
                          }}
                        >
                          <IconComp
                            size={16}
                            weight="regular"
                            color={isDisabled ? 'var(--color-neutral-300)' : 'var(--color-neutral-900)'}
                          />
                          <span className={`wbc__textbox-mode-dropdown-label${isSelected ? ' wbc__textbox-mode-dropdown-label--selected' : ''}${isDisabled ? ' wbc__textbox-mode-dropdown-label--disabled' : ''}`}>
                            {mode.label}
                          </span>
                          {isSelected && !isDisabled && (
                            <Check size={16} weight="regular" color="var(--color-primary-500)" className="wbc__textbox-mode-dropdown-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={ArrowUp}
            iconWeight="bold"
            className="wbc__textbox-send-btn"
            disabled={!query.trim()}
            onClick={() => {
              if (selectedMode === 'generate-memo' && onGenerateMemo) {
                onGenerateMemo(query.trim());
                setQuery('');
              } else if (selectedMode === 'create-chart' && onCreateChart) {
                onCreateChart(query.trim());
                setQuery('');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel Title Dropdown — Rename / Clone / Delete on header click      */
/* ------------------------------------------------------------------ */

function PanelTitleDropdown({ showClone = true, renameType, renameName = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { openRename } = useContext(ModifyContext);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="wbc__panel-title-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className="wbc__panel-title-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CaretDown size={12} weight="regular" color="var(--color-icon-medium)" />
      </button>
      {open && (
        <div className="wbc__panel-title-dropdown" role="menu">
          <button
            type="button"
            className="wbc__panel-title-dropdown-item"
            role="menuitem"
            onClick={() => { setOpen(false); openRename(renameType, renameName); }}
          >
            <PencilSimple size={16} weight="regular" color="var(--color-icon-dark)" />
            <span>Rename</span>
          </button>
          {showClone && (
            <button
              type="button"
              className="wbc__panel-title-dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <CloneIcon size={16} color="var(--color-icon-dark)" />
              <span>Clone</span>
            </button>
          )}
          <button
            type="button"
            className="wbc__panel-title-dropdown-item wbc__panel-title-dropdown-item--danger"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <TrashSimple size={16} weight="regular" color="#F93D3D" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Use in Sage Dialog                                                  */
/* ------------------------------------------------------------------ */

const SAGE_DESCRIPTIONS = [
  'This widget breaks down how total sales cycle time is distributed across different activity levels and shows how higher activity volumes correlate with longer sales cycles. It highlights which activity ranges consume the most time before deals close, helping you identify where excessive engagement may be slowing progress and where focusing on fewer, higher-quality activities could shorten the sales cycle.',
  'This widget summarizes completed sales activities by type, channel, and outcome, providing a clear view of team engagement patterns. It helps identify which activity types drive the most meaningful interactions and which may need optimization.',
  'This widget analyzes the effectiveness of different sales activities by measuring their correlation with deal progression and close rates. It surfaces which activities have the highest impact on moving opportunities forward.',
  'This widget identifies the most impactful activity patterns by examining sequences and combinations of sales activities that consistently lead to successful deal closures.',
  'This widget segments activity effectiveness by deal size, revealing how the impact of different sales activities varies across enterprise, mid-market, and SMB deal categories.',
];

function RegenerateButton({ onRegenerate, regenerating }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={regenerating ? null : Sparkle}
      label={regenerating ? (
        <span className="wbc__regen-label">
          <img src={spinnerGif} alt="" width={12} height={12} />
          Regenerating...
        </span>
      ) : 'Regenerate'}
      onClick={onRegenerate}
      disabled={regenerating}
    />
  );
}

function useRegenerate(initialDesc, descriptions) {
  const [description, setDescription] = useState(initialDesc);
  const [regenerating, setRegenerating] = useState(false);

  function handleRegenerate() {
    setRegenerating(true);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * descriptions.length);
      setDescription(descriptions[idx]);
      setRegenerating(false);
    }, 1500);
  }

  return { description, setDescription, regenerating, handleRegenerate };
}

function UseInSageDialog({ stepName, onClose }) {
  const [tableName, setTableName] = useState(stepName);
  const { description, setDescription, regenerating, handleRegenerate } = useRegenerate(
    SAGE_DESCRIPTIONS[ANALYSIS_STEPS.indexOf(stepName)] || SAGE_DESCRIPTIONS[0],
    SAGE_DESCRIPTIONS
  );

  return (
    <div className="wbc__dialog-overlay">
      <div className="wbc__sage-dialog">
        {/* Header */}
        <div className="wbc__sage-dialog-header">
          <span className="text-h2-semibold">Use in Sage</span>
          <button
            type="button"
            className="wbc__sage-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} weight="regular" color="var(--color-icon-medium)" />
          </button>
        </div>

        {/* Body */}
        <div className="wbc__sage-dialog-body">
          <TextInput
            label={<>Table Name<span className="wbc__sage-required">*</span></>}
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
          />
          <div className="wbc__sage-dialog-desc-group">
            <TextArea
              label={<>Table Description<span className="wbc__sage-required">*</span></>}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={regenerating}
            />
            <div className="wbc__sage-dialog-regen">
              <RegenerateButton onRegenerate={handleRegenerate} regenerating={regenerating} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="wbc__sage-dialog-footer">
          <Button variant="ghost" size="md" label="Cancel" onClick={onClose} />
          <Button variant="primary" size="md" label="Save" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add to Dashboard Dialog                                             */
/* ------------------------------------------------------------------ */

const MOCK_DASHBOARDS = [
  'Sales Performance Dashboard',
  'Revenue Analytics',
  'Pipeline Overview',
  'Team Metrics Dashboard',
  'Executive Summary',
];

const DASHBOARD_DESCRIPTIONS = [
  'This widget surfaces all Closed Won opportunities along with their key performance metrics, giving you a clear view of what successful deals look like. It helps you analyze patterns across won deals such as deal size, sales cycle length, activity volume, and conversion efficiency.',
  'This widget breaks down how total sales cycle time is distributed across different activity levels and shows how higher activity volumes correlate with longer sales cycles.',
  'This widget summarizes completed sales activities by type, channel, and outcome, providing a clear view of team engagement patterns.',
  'This widget analyzes the effectiveness of different sales activities by measuring their correlation with deal progression and close rates.',
  'This widget identifies the most impactful activity patterns by examining sequences and combinations of sales activities that consistently lead to successful deal closures.',
];

function AddToDashboardDialog({ widgetTitle, onClose, onSave, mode = 'add' }) {
  const [title, setTitle] = useState(widgetTitle);
  const { description, setDescription, regenerating, handleRegenerate } = useRegenerate(
    DASHBOARD_DESCRIPTIONS[0],
    DASHBOARD_DESCRIPTIONS
  );
  const [selectedDashboards, setSelectedDashboards] = useState([]);
  const [customDashboards, setCustomDashboards] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const allDashboards = [...MOCK_DASHBOARDS, ...customDashboards];
  const filtered = allDashboards.filter(
    (d) => d.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const allSelected = filtered.length > 0 && filtered.every((d) => selectedDashboards.includes(d));
  const showCreate = searchQuery.trim() && !allDashboards.some(
    (d) => d.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  function toggleDashboard(name) {
    setSelectedDashboards((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedDashboards((prev) => prev.filter((d) => !filtered.includes(d)));
    } else {
      setSelectedDashboards((prev) => [...new Set([...prev, ...filtered])]);
    }
  }

  function createDashboard(name) {
    setCustomDashboards((prev) => [...prev, name]);
    setSelectedDashboards((prev) => [...prev, name]);
    setSearchQuery('');
  }

  function removeDashboard(name) {
    setSelectedDashboards((prev) => prev.filter((d) => d !== name));
  }

  function handleOpen() {
    setDropdownOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  return (
    <div className="wbc__dialog-overlay">
      <div className="wbc__sage-dialog">
        {/* Header */}
        <div className="wbc__sage-dialog-header">
          <span className="text-h2-semibold">Add to Dashboard</span>
          <button
            type="button"
            className="wbc__sage-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} weight="regular" color="var(--color-icon-medium)" />
          </button>
        </div>

        {/* Body */}
        <div className="wbc__sage-dialog-body">
          <TextInput
            label={<>Widget Title<span className="wbc__sage-required">*</span></>}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="wbc__sage-dialog-desc-group">
            <TextArea
              label="Widget Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={regenerating}
            />
            <div className="wbc__sage-dialog-regen">
              <RegenerateButton onRegenerate={handleRegenerate} regenerating={regenerating} />
            </div>
          </div>

          {/* Dashboard picker */}
          <div className="wbc__dash-picker">
            <label className="wbc__dash-picker-label text-h3-medium">
              Add this widget to a dashboard<span className="wbc__sage-required">*</span>
            </label>
            <div className="wbc__dash-picker-field" ref={dropdownRef}>
              <div
                className="wbc__dash-picker-input"
                onClick={handleOpen}
              >
                <div className="wbc__dash-picker-tags">
                  {selectedDashboards.map((d) => {
                    const isNew = customDashboards.includes(d);
                    return (
                      <span key={d} className="wbc__dash-tag">
                        {isNew && <span className="wbc__dash-tag-new">New</span>}
                        <span className="wbc__dash-tag-name">{d}</span>
                        <button
                          type="button"
                          className="wbc__dash-tag-remove"
                          onClick={(e) => { e.stopPropagation(); removeDashboard(d); }}
                        >
                          <X size={12} weight="regular" color="var(--color-icon-medium)" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    ref={searchRef}
                    className="wbc__dash-picker-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={selectedDashboards.length ? '' : 'Search or create a dashboard'}
                    onClick={(e) => { e.stopPropagation(); handleOpen(); }}
                  />
                </div>
                <CaretDown size={20} weight="regular" color="var(--color-neutral-300)" />
              </div>

              {dropdownOpen && (
                <div className="wbc__dash-picker-dropdown">
                  {/* Select all */}
                  <div
                    className="wbc__dash-picker-option"
                    onClick={toggleSelectAll}
                  >
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && filtered.some((d) => selectedDashboards.includes(d))}
                      onChange={toggleSelectAll}
                    />
                    <span className="wbc__dash-picker-option-label">Select all</span>
                  </div>

                  {/* Dashboard list */}
                  <div className="wbc__dash-picker-list">
                    {filtered.map((d) => (
                      <div
                        key={d}
                        className="wbc__dash-picker-option"
                        onClick={() => toggleDashboard(d)}
                      >
                        <Checkbox
                          checked={selectedDashboards.includes(d)}
                          onChange={() => toggleDashboard(d)}
                        />
                        <span className="wbc__dash-picker-option-label">{d}</span>
                      </div>
                    ))}
                  </div>

                  {/* Create new */}
                  {showCreate && (
                    <div
                      className="wbc__dash-picker-create"
                      onClick={() => createDashboard(searchQuery.trim())}
                    >
                      <div className="wbc__dash-picker-create-btn">
                        <Plus size={16} weight="regular" color="var(--color-primary-500)" />
                        <span className="wbc__dash-picker-create-text">Create</span>
                      </div>
                      <span className="wbc__dash-picker-create-chip">
                        <SquaresFour size={16} weight="regular" color="var(--color-neutral-900)" />
                        <span>{searchQuery.trim()}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="wbc__sage-dialog-footer">
          <Button variant="ghost" size="md" label="Cancel" onClick={onClose} />
          <Button variant="primary" size="md" label={mode === 'edit' ? 'Update' : 'Save'} onClick={() => { if (onSave) onSave(); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Added to Dashboard Dropdown Button                                  */
/* ------------------------------------------------------------------ */

function AddedToDashboardBtn({ onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="wbc__added-dash-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn--secondary btn--sm wbc__added-dash-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="btn__icon">
          <CheckCircleOutlineIcon size={14} />
        </span>
        <span>Added to Dashboard</span>
        <span className="btn__icon">
          <CaretDown size={12} weight="regular" />
        </span>
      </button>
      {open && (
        <div className="wbc__added-dash-dropdown">
          <button
            type="button"
            className="wbc__added-dash-dropdown-item"
            onClick={() => { setOpen(false); onEdit(); }}
          >
            <PencilSimple size={16} weight="regular" color="var(--color-icon-dark)" />
            <span>Edit Details</span>
          </button>
          <button
            type="button"
            className="wbc__added-dash-dropdown-item wbc__added-dash-dropdown-item--danger"
            onClick={() => { setOpen(false); onRemove(); }}
          >
            <TrashSimple size={16} weight="regular" color="#F93D3D" />
            <span>Remove from Dashboards</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analysis Panel — right panel when running steps                    */
/* ------------------------------------------------------------------ */

function AnalysisPanel() {
  const { activeAnalysisStep, running, allStepsDone, runAllSteps } = useContext(ModifyContext);
  const currentStep = ANALYSIS_STEPS[activeAnalysisStep] || ANALYSIS_STEPS[0];
  const [activeTab, setActiveTab] = useState('output');
  const [sageDialogOpen, setSageDialogOpen] = useState(false);
  const [dashDialogOpen, setDashDialogOpen] = useState(false);
  const [dashDialogMode, setDashDialogMode] = useState('add');
  const [addedToDashboard, setAddedToDashboard] = useState(false);
  const [showDashToast, setShowDashToast] = useState(false);
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: undefined, hour12: true, timeZoneName: 'short' });
  const stepData = STEP_DATA[activeAnalysisStep] || STEP_DATA[0];
  const { columns, rows, count } = stepData;

  return (
    <div className="wbc__analysis-panel">
      {/* Panel header */}
      <div className="wbc__analysis-panel-header">
        <div className="wbc__analysis-panel-title-area">
          <Table size={22} weight="regular" color="var(--color-icon-medium)" />
          <span className="wbc__analysis-panel-title">
            <strong>Analysis:</strong> {ANALYSIS_TITLE} Analysis
          </span>
          <PanelTitleDropdown showClone={false} renameType="analysis" renameName={ANALYSIS_TITLE} />
        </div>
      </div>

      {/* Step bar */}
      <div className="wbc__analysis-step-bar">
        <span className="wbc__analysis-step-bar-name">
          Step {activeAnalysisStep + 1}: {currentStep}
        </span>
        <span className="text-body-2-regular wbc__analysis-step-bar-time">
          {timestamp}
        </span>
      </div>

      {/* Body */}
      <div className="wbc__analysis-panel-body">
        {/* Sub-header with title */}
        <div className="wbc__analysis-output-title">
          <span className="text-h3-medium">
            1. {currentStep}
          </span>
        </div>

        {/* Tabs + actions row */}
        <div className="wbc__analysis-tabs-row">
          <div className="wbc__analysis-tabs">
            <TabToggle
              icon={<ChartBar size={12} weight="regular" />}
              label="Output"
              active={activeTab === 'output'}
              onClick={() => setActiveTab('output')}
            />
            <TabToggle
              icon={<GearSix size={12} weight="regular" />}
              label="Formula"
              active={activeTab === 'formula'}
              onClick={() => setActiveTab('formula')}
            />
          </div>
          <div className="wbc__analysis-tab-actions">
            <Button variant="secondary" size="sm" icon={Sparkle} label="Use in Sage" disabled={!allStepsDone} onClick={() => setSageDialogOpen(true)} />
            {addedToDashboard ? (
              <AddedToDashboardBtn
                onEdit={() => { setDashDialogMode('edit'); setDashDialogOpen(true); }}
                onRemove={() => setAddedToDashboard(false)}
              />
            ) : (
              <Button variant="secondary" size="sm" icon={DashboardIcon} label="Add to Dashboard" disabled={!allStepsDone} onClick={() => { setDashDialogMode('add'); setDashDialogOpen(true); }} />
            )}
            <button className="wbc__analysis-icon-btn" type="button">
              <DownloadSimple size={16} weight="regular" />
            </button>
          </div>
        </div>

        {/* Data table */}
        <div className="wbc__analysis-table-wrap">
          <table className="wbc__analysis-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={(activeAnalysisStep === 0 || activeAnalysisStep === 2) && (j === 1 || j === 2) ? 'wbc__analysis-cell--bold' : ''}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="wbc__analysis-pagination">
          <div className="wbc__analysis-pagination-nav">
            <button className="wbc__analysis-page-btn" type="button">
              <CaretLeft size={12} weight="regular" />
            </button>
            <span className="wbc__analysis-pagination-text">1-10 of {count}</span>
            <button className="wbc__analysis-page-btn" type="button">
              <CaretRight size={12} weight="regular" />
            </button>
          </div>
          <div className="wbc__analysis-pagination-count">
            <span>Count:</span>
            <span className="wbc__analysis-pagination-count-value">
              {count}
              <CaretDown size={12} weight="regular" />
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      {allStepsDone ? (
        <div className="wbc__analysis-done-footer">
          <ModifyPlan
            label="Modify Formula"
            modifications={[]}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            expanded={false}
            onExpandedChange={() => {}}
            disabled
          />
          <div className="wbc__analysis-done-footer-actions">
            <Button
              variant="secondary"
              size="md"
              icon={CheckCircle}
              label="Apply Changes"
              disabled
            />
            <Button
              variant="secondary"
              size="md"
              icon={ArrowCounterClockwise}
              label="Rerun All Steps"
            />
          </div>
        </div>
      ) : (
        <div className="wbc__analysis-footer">
          <div className="wbc__footer-status">
            <img src={spinnerGif} alt="Running" className="wbc__spinner-gif" width={20} height={20} />
            <span className="wbc__footer-status-text">
              Executing step {activeAnalysisStep + 1} of {ANALYSIS_STEPS.length}...
            </span>
          </div>
        </div>
      )}

      {sageDialogOpen && (
        <UseInSageDialog
          stepName={currentStep}
          onClose={() => setSageDialogOpen(false)}
        />
      )}
      {dashDialogOpen && (
        <AddToDashboardDialog
          widgetTitle={currentStep}
          mode={dashDialogMode}
          onClose={() => setDashDialogOpen(false)}
          onSave={() => { setAddedToDashboard(true); setShowDashToast(true); }}
        />
      )}
      {showDashToast && createPortal(
        <div className="wbc__toast-wrapper">
          <Toast
            status="success"
            message="Widget added to dashboard successfully"
            onClose={() => setShowDashToast(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Memo Panel — right panel for generated memos                       */
/* ------------------------------------------------------------------ */

function renderBoldText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function MemoLine({ children, tag: Tag = 'p', className = '', modifyId }) {
  const [hovered, setHovered] = useState(false);
  const [modifyValue, setModifyValue] = useState('');
  const inputRef = useRef(null);
  const { activeModifyId, setActiveModifyId, memoModifications, addMemoModification } = useContext(ModifyContext);
  const editing = activeModifyId === modifyId;

  const setEditing = useCallback((val) => {
    setActiveModifyId(val ? modifyId : null);
  }, [modifyId, setActiveModifyId]);

  useEffect(() => {
    if (!editing) setModifyValue('');
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function handleSubmit() {
    if (modifyValue.trim()) {
      addMemoModification(modifyValue.trim());
      setModifyValue('');
      setEditing(false);
    }
  }

  return (
    <div
      className={`wbc__memo-line ${(hovered || editing) ? 'wbc__memo-line--hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Tag className={className}>{children}</Tag>
      {(hovered || editing) && (
        <div className="wbc__modify-step-anchor">
          {!editing ? (
            <button
              className="wbc__modify-step-btn"
              type="button"
              onClick={() => setEditing(true)}
            >
              <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
              <span className="text-body-2-regular wbc__modify-step-label">Modify Step</span>
            </button>
          ) : (
            <div className="wbc__modify-step-dropdown">
              <div className="wbc__modify-step-dropdown-header">
                <div className="wbc__modify-step-dropdown-title">
                  <PencilSimpleLine size={12} weight="regular" color="var(--color-primary-500)" />
                  <span className="text-body-2-regular">Modify Step</span>
                </div>
                <button
                  className="wbc__modify-step-close"
                  type="button"
                  onClick={() => { setEditing(false); setModifyValue(''); }}
                  aria-label="Close"
                >
                  <X size={12} weight="regular" />
                </button>
              </div>
              <div className="wbc__modify-step-dropdown-body">
                <div className="wbc__modify-step-box">
                  <textarea
                    ref={inputRef}
                    className="wbc__modify-step-textarea text-body-1-regular"
                    placeholder="What would you like to modify?"
                    value={modifyValue}
                    onChange={(e) => setModifyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                      if (e.key === 'Escape') { setEditing(false); setModifyValue(''); }
                    }}
                    rows={3}
                  />
                  <div className="wbc__modify-step-actions">
                    <button
                      className={`wbc__modify-step-submit ${modifyValue.trim() ? 'wbc__modify-step-submit--active' : ''}`}
                      type="button"
                      onClick={handleSubmit}
                      disabled={!modifyValue.trim()}
                      aria-label="Submit"
                    >
                      <ArrowUp size={12} weight="bold" color={modifyValue.trim() ? 'var(--color-white)' : 'var(--color-neutral-300)'} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemoPanel() {
  const {
    memoData, memoLoading, memoModifications,
    addMemoModification, editMemoModification, deleteMemoModification,
    activeModifyId, setActiveModifyId,
  } = useContext(ModifyContext);
  const [activeTab, setActiveTab] = useState('output');
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' });

  if (memoLoading) {
    return (
      <div className="wbc__memo-panel">
        <div className="wbc__memo-panel-header">
          <div className="wbc__memo-panel-title-area">
            <MemoIcon size={22} color="var(--color-icon-medium)" />
            <span className="wbc__memo-panel-title">
              <strong>Memo:</strong> Generating...
            </span>
          </div>
        </div>
        <div className="wbc__memo-panel-body wbc__memo-panel-body--loading">
          <img src={spinnerGif} alt="Generating memo" width={32} height={32} />
          <span className="wbc__memo-loading-text">Generating memo...</span>
        </div>
      </div>
    );
  }

  if (!memoData) return null;

  return (
    <div className="wbc__memo-panel">
      {/* Panel header */}
      <div className="wbc__memo-panel-header">
        <div className="wbc__memo-panel-title-area">
          <MemoIcon size={22} color="var(--color-icon-medium)" />
          <span className="wbc__memo-panel-title">
            <strong>Memo:</strong> {memoData.query}
          </span>
          <PanelTitleDropdown showClone={true} renameType="memo" renameName={memoData.query} />
        </div>
      </div>

      {/* Memo sub-header — title + timestamp */}
      <div className="wbc__memo-step-bar">
        <span className="wbc__memo-step-bar-name">Sales Activity Effectiveness</span>
        <span className="text-body-2-regular wbc__memo-step-bar-time">{timestamp}</span>
      </div>

      {/* Body */}
      <div className="wbc__memo-panel-body">
        {/* Tabs row */}
        <div className="wbc__memo-tabs-row">
          <div className="wbc__memo-tabs">
            <TabToggle
              icon={<ChartBar size={12} weight="regular" />}
              label="Output"
              active={activeTab === 'output'}
              onClick={() => setActiveTab('output')}
            />
            <TabToggle
              icon={<GearSix size={12} weight="regular" />}
              label="Formula"
              active={activeTab === 'formula'}
              onClick={() => setActiveTab('formula')}
            />
          </div>
        </div>

        {/* Memo content */}
        <div className="wbc__memo-content">
          {memoData.content.split('\n').map((line, i) => {
            if (line.trim() === '') return <br key={i} />;
            if (line.startsWith('## '))
              return <MemoLine key={i} tag="h2" className="wbc__memo-h2" modifyId={`memo-line-${i}`}>{line.slice(3)}</MemoLine>;
            if (line.startsWith('### '))
              return <MemoLine key={i} tag="h3" className="wbc__memo-h3" modifyId={`memo-line-${i}`}>{line.slice(4)}</MemoLine>;
            if (line.startsWith('| '))
              return <MemoLine key={i} tag="p" className="wbc__memo-table-row" modifyId={`memo-line-${i}`}>{line}</MemoLine>;
            if (line.startsWith('- '))
              return <MemoLine key={i} tag="li" className="wbc__memo-li" modifyId={`memo-line-${i}`}>{renderBoldText(line.slice(2))}</MemoLine>;
            if (/^\d+\. /.test(line))
              return <MemoLine key={i} tag="li" className="wbc__memo-li wbc__memo-li--ordered" modifyId={`memo-line-${i}`}>{renderBoldText(line.replace(/^\d+\. /, ''))}</MemoLine>;
            if (line.startsWith('*'))
              return <MemoLine key={i} tag="p" className="wbc__memo-footnote" modifyId={`memo-line-${i}`}>{line}</MemoLine>;
            return <MemoLine key={i} tag="p" className="wbc__memo-p" modifyId={`memo-line-${i}`}>{renderBoldText(line)}</MemoLine>;
          })}
        </div>
      </div>

      {/* Footer — Modify Memo */}
      <div className="wbc__memo-panel-footer">
        <ModifyPlan
          label="Modify Memo"
          placeholder="Adjust this memo to... (e.g., add a section, change the tone)"
          modifications={memoModifications}
          onAdd={addMemoModification}
          onEdit={editMemoModification}
          onDelete={deleteMemoModification}
          expanded={activeModifyId === 'memo'}
          onExpandedChange={(val) => setActiveModifyId(val ? 'memo' : null)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Tooltips                                                      */
/* ------------------------------------------------------------------ */

function ChartPieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="wbc__chart-tooltip">
      <div className="wbc__chart-tooltip-row">
        <span
          className="wbc__chart-tooltip-dot"
          style={{ backgroundColor: CHART_COLORS[payload[0].payload.colorIndex] }}
        />
        <p className="wbc__chart-tooltip-label">{name}</p>
      </div>
      <p className="wbc__chart-tooltip-value">{value}%</p>
    </div>
  );
}

function ChartBarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="wbc__chart-tooltip">
      <p className="wbc__chart-tooltip-label">{label}</p>
      <p className="wbc__chart-tooltip-value">Health Score: {payload[0].value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Panel — right panel when Create Chart mode used               */
/* ------------------------------------------------------------------ */

function ChartPanel() {
  const {
    chartData, chartLoading,
    activeModifyId, setActiveModifyId,
  } = useContext(ModifyContext);
  const [activeTab, setActiveTab] = useState('output');
  const [pieActiveIndex, setPieActiveIndex] = useState(null);
  const [dashDialogOpen, setDashDialogOpen] = useState(false);
  const [dashDialogTitle, setDashDialogTitle] = useState('');
  const [showDashToast, setShowDashToast] = useState(false);
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' });

  if (chartLoading) {
    return (
      <div className="wbc__chart-panel">
        <div className="wbc__chart-panel-header">
          <div className="wbc__chart-panel-title-area">
            <ScatterChartIcon size={22} color="var(--color-icon-medium)" />
            <span className="wbc__chart-panel-title">
              <strong>Chart:</strong> Generating...
            </span>
          </div>
        </div>
        <div className="wbc__chart-panel-body wbc__chart-panel-body--loading">
          <img src={spinnerGif} alt="Generating chart" width={32} height={32} />
          <span className="wbc__chart-loading-text">Generating charts...</span>
        </div>
      </div>
    );
  }

  if (!chartData) return null;

  const sections = chartData.sections || [];

  return (
    <div className="wbc__chart-panel">
      {/* Panel header */}
      <div className="wbc__chart-panel-header">
        <div className="wbc__chart-panel-title-area">
          <ScatterChartIcon size={22} color="var(--color-icon-medium)" />
          <span className="wbc__chart-panel-title">
            <strong>Chart:</strong> {chartData.title}
          </span>
          <PanelTitleDropdown showClone={true} renameType="chart" renameName={chartData.title} />
        </div>
        <span className="wbc__chart-panel-timestamp">{timestamp}</span>
      </div>

      {/* Body — scrollable chart sections */}
      <div className="wbc__chart-panel-body">
        {sections.map((section, idx) => (
          <div key={idx} className="wbc__chart-section">
            {/* Section title */}
            <div className="wbc__chart-section-title">
              <span className="text-body-1-medium">
                {idx + 1}. {section.title}
              </span>
            </div>

            {/* Tabs + actions row */}
            <div className="wbc__chart-tabs-row">
              <div className="wbc__chart-tabs">
                <TabToggle
                  icon={<ScatterChartIcon size={12} />}
                  label="Output"
                  active={activeTab === 'output'}
                  onClick={() => setActiveTab('output')}
                />
                <TabToggle
                  icon={<GearSix size={12} weight="regular" />}
                  label="Formula"
                  active={activeTab === 'formula'}
                  onClick={() => setActiveTab('formula')}
                />
              </div>
              <div className="wbc__chart-tab-actions">
                <Button variant="secondary" size="sm" icon={DashboardIcon} label="Add to Dashboard" onClick={() => { setDashDialogTitle(section.title); setDashDialogOpen(true); }} />
                <button className="wbc__chart-icon-btn" type="button">
                  <DownloadSimple size={16} weight="regular" />
                </button>
                <button className="wbc__chart-icon-btn" type="button">
                  <DotsThree size={16} weight="regular" />
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="wbc__chart-container">
              {section.type === 'pie' ? (
                <div className="wbc__chart-pie-wrapper">
                  <div className="wbc__chart-pie-legend">
                    {section.data.map((entry, i) => (
                      <div
                        className="wbc__chart-pie-legend-item"
                        key={i}
                        onMouseEnter={() => setPieActiveIndex(i)}
                        onMouseLeave={() => setPieActiveIndex(null)}
                      >
                        <div
                          className="wbc__chart-pie-legend-swatch"
                          style={{
                            backgroundColor: CHART_COLORS[entry.colorIndex],
                            opacity: pieActiveIndex === null || pieActiveIndex === i ? 1 : 0.4,
                          }}
                        />
                        <span
                          className="wbc__chart-pie-legend-label"
                          style={{
                            opacity: pieActiveIndex === null || pieActiveIndex === i ? 1 : 0.5,
                          }}
                        >
                          {entry.name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={section.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={150}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setPieActiveIndex(index)}
                        onMouseLeave={() => setPieActiveIndex(null)}
                      >
                        {section.data.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[entry.colorIndex]}
                            opacity={pieActiveIndex === null || pieActiveIndex === i ? 1 : 0.4}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="wbc__chart-bar-wrapper">
                  <span className="wbc__chart-bar-y-label">{section.yLabel || 'Value'}</span>
                  <div className="wbc__chart-bar-inner">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={section.data} barSize={50}>
                        <CartesianGrid
                          strokeDasharray="0"
                          stroke="var(--color-neutral-100)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="segment"
                          tick={{
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 12,
                            fill: 'var(--color-text-secondary)',
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          tick={{
                            fontFamily: 'var(--font-family-primary)',
                            fontSize: 10,
                            fill: 'var(--color-text-secondary)',
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={<ChartBarTooltip />}
                          cursor={{ fill: 'var(--color-primary-50)', radius: 4 }}
                        />
                        <Bar
                          dataKey="score"
                          fill="var(--color-primary-100)"
                          radius={[0, 0, 0, 0]}
                          activeBar={{ fill: 'var(--color-primary-300)', cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="wbc__chart-bar-x-label">{section.xLabel || 'Category'}</p>
                  </div>
                </div>
              )}

              {/* Modify Chart */}
              <div className="wbc__chart-modify-wrap">
                <ModifyPlan
                  label="Modify Chart"
                  placeholder="Adjust this chart to... (e.g., change chart type, filter data)"
                  modifications={[]}
                  onAdd={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  expanded={activeModifyId === `chart-${idx}`}
                  onExpandedChange={(val) => setActiveModifyId(val ? `chart-${idx}` : null)}
                />
              </div>
            </div>

            {idx < sections.length - 1 && <div className="wbc__chart-section-divider" />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="wbc__chart-panel-footer">
        <Button
          variant="secondary"
          size="md"
          icon={CheckCircle}
          label="Apply Changes"
          disabled
        />
      </div>

      {dashDialogOpen && (
        <AddToDashboardDialog
          widgetTitle={dashDialogTitle}
          onClose={() => setDashDialogOpen(false)}
          onSave={() => setShowDashToast(true)}
        />
      )}
      {showDashToast && createPortal(
        <div className="wbc__toast-wrapper">
          <Toast
            status="success"
            message="Widget added to dashboard successfully"
            onClose={() => setShowDashToast(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Action Card (left panel)                                      */
/* ------------------------------------------------------------------ */

function ChartActionCard({ title, count = 0, isActive, onClick, isLast = false }) {
  return (
    <div
      className={`wbc__action-card ${isActive ? 'wbc__action-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="wbc__action-card-inner">
        <div className="wbc__action-card-icon-frame">
          <div className="wbc__action-card-icon-container">
            <ScatterChartIcon size={36} color="#757a97" />
          </div>
        </div>
        <div className="wbc__action-card-content">
          <div className="wbc__action-card-meta">
            <CheckCircle size={12} weight="fill" color="var(--color-success)" />
            <span className="wbc__action-card-meta-text">Chart</span>
            {count >= 1 && (
              <span className="wbc__chart-count-badge">{count}</span>
            )}
          </div>
          <p className="wbc__action-card-title" title={title}>{title}</p>
        </div>
        <ActionCardDotsMenu isLast={isLast} renameType="chart" renameName={title} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan Footer — Modify Plan input + action buttons                   */
/* ------------------------------------------------------------------ */

function PlanFooter() {
  const {
    activeModifyId, setActiveModifyId,
    modifications, addModification, editModification, deleteModification,
    applyingChanges, applyChanges, isViewingOldVersion, runAllSteps,
  } = useContext(ModifyContext);
  const modifyPlanExpanded = activeModifyId === 'modify-plan';

  /* Plan-level modifications (source = 'plan') */
  const planMods = modifications.filter((m) => m.source === 'plan');
  const totalCount = modifications.length;
  const hasModifications = totalCount > 0;

  const handlePlanAdd = useCallback((text) => {
    addModification(text, 'plan');
  }, [addModification]);

  const handlePlanEdit = useCallback((id, newText) => {
    editModification(id, newText);
  }, [editModification]);

  const handlePlanDelete = useCallback((id) => {
    deleteModification(id);
  }, [deleteModification]);

  if (applyingChanges) {
    return (
      <div className="wbc__panel-footer">
        <div className="wbc__footer-status">
          <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={20} height={20} />
          <span className="wbc__footer-status-text">Applying modifications...</span>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Square}
          iconWeight="fill"
          label="Stop"
        />
      </div>
    );
  }

  return (
    <div className="wbc__plan-footer">
      <ModifyPlan
        label="Modify Plan"
        modifications={planMods}
        onAdd={handlePlanAdd}
        onEdit={handlePlanEdit}
        onDelete={handlePlanDelete}
        expanded={modifyPlanExpanded}
        onExpandedChange={(val) => setActiveModifyId(val ? 'modify-plan' : null)}
        disabled={isViewingOldVersion}
      />
      <div className="wbc__plan-footer-actions">
        <Button
          variant="secondary"
          size="md"
          icon={CheckCircle}
          label={hasModifications ? `Apply Changes (${totalCount})` : 'Apply Changes'}
          disabled={!hasModifications || isViewingOldVersion}
          onClick={applyChanges}
        />
        <Button
          variant="primary"
          size="md"
          icon={Play}
          label="Run All Steps"
          disabled={hasModifications || isViewingOldVersion}
          onClick={runAllSteps}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main WorkbookChat page                                             */
/* ------------------------------------------------------------------ */

export function WorkbookChat({
  user = { name: 'Ammie Diego', initials: 'AD', email: 'ammie.diego@work.com' },
  query = '',
  onNavigate,
  onStop,
  menuOpen,
  onMenuToggle,
}) {
  const [activeCard, setActiveCard] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasSeenPlan = localStorage.getItem('wbc_planReady') === 'true';
  const [planReady, setPlanReady] = useState(false);
  const [titleDropdownOpen, setTitleDropdownOpen] = useState(false);
  const titleDropdownRef = useRef(null);
  /* Rename dialog — { type: 'workbook'|'analysis'|'memo'|'chart', value: string } */
  const [renameDialog, setRenameDialog] = useState(null);

  const openRename = useCallback((type, currentName) => {
    setRenameDialog({ type, value: currentName });
  }, []);

  const RENAME_LABELS = {
    workbook: { title: 'Rename Workbook', label: 'Workbook name', placeholder: 'Enter workbook name' },
    analysis: { title: 'Rename Analysis', label: 'Analysis name', placeholder: 'Enter analysis name' },
    memo: { title: 'Rename Memo', label: 'Memo name', placeholder: 'Enter memo name' },
    chart: { title: 'Rename Chart', label: 'Chart name', placeholder: 'Enter chart name' },
  };

  /* Auto-complete building plan — 2s if returning, 5s on first visit */
  useEffect(() => {
    if (planReady) {
      localStorage.setItem('wbc_planReady', 'true');
      return;
    }
    const timer = setTimeout(() => setPlanReady(true), hasSeenPlan ? 2000 : 5000);
    return () => clearTimeout(timer);
  }, [planReady]);

  /* Close title dropdown on outside click */
  useEffect(() => {
    if (!titleDropdownOpen) return;
    function handleClick(e) {
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target)) {
        setTitleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [titleDropdownOpen]);

  const [applyingChanges, setApplyingChanges] = useState(false);
  const [planVersion, setPlanVersion] = useState(1);
  const [viewingVersion, setViewingVersion] = useState(1);
  const [showingDiff, setShowingDiff] = useState(false);
  const [running, setRunning] = useState(false);
  const [allStepsDone, setAllStepsDone] = useState(false);
  const [activePanel, setActivePanel] = useState('plan'); /* 'plan' | 'analysis' | 'memo' | 'chart' */
  const [analysisSource, setAnalysisSource] = useState(null); /* { planVersion } */
  const [activeAnalysisStep, setActiveAnalysisStep] = useState(0);
  const [activeModifyId, setActiveModifyId] = useState(null);
  const [modifications, setModifications] = useState([]);
  const modNextId = useRef(1);

  const addModification = useCallback((text, source) => {
    setModifications((prev) => [...prev, { id: modNextId.current++, text, source }]);
  }, []);

  const editModification = useCallback((id, newText) => {
    setModifications((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText } : m)));
  }, []);

  const deleteModification = useCallback((id) => {
    setModifications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearModifications = useCallback(() => {
    setModifications([]);
  }, []);

  const applyChanges = useCallback(() => {
    setApplyingChanges(true);
    setActiveModifyId(null);
    setActiveCard(0);
    setIsPaused(false);
    /* Simulate applying — after 5s finish and bump version */
    setTimeout(() => {
      setApplyingChanges(false);
      setPlanVersion((v) => {
        const next = v + 1;
        setViewingVersion(next);
        return next;
      });
      setModifications([]);
    }, 5000);
  }, []);

  const runAllSteps = useCallback(() => {
    setRunning(true);
    setAllStepsDone(false);
    setActivePanel('analysis');
    setAnalysisSource({ planVersion });
    setActiveAnalysisStep(0);
    setActiveModifyId(null);
    /* Simulate steps executing one by one */
    ANALYSIS_STEPS.forEach((_, i) => {
      setTimeout(() => setActiveAnalysisStep(i), i * 3000);
    });
    /* Mark done after last step completes */
    setTimeout(() => {
      setRunning(false);
      setAllStepsDone(true);
    }, ANALYSIS_STEPS.length * 3000);
  }, []);

  /* Memo state */
  const [memoData, setMemoData] = useState(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoModifications, setMemoModifications] = useState([]);
  const memoModNextId = useRef(1);

  const handleGenerateMemo = useCallback((query) => {
    setMemoLoading(true);
    setMemoData(null);
    setMemoModifications([]);
    memoModNextId.current = 1;
    setActivePanel('memo');
    /* Simulate generation delay */
    setTimeout(() => {
      setMemoData({ title: 'Memo: Sales Activity Effectiveness', query: 'Sales Activity Effectiveness', content: MOCK_MEMO_CONTENT });
      setMemoLoading(false);
    }, 3000);
  }, []);

  const addMemoModification = useCallback((text) => {
    setMemoModifications((prev) => [...prev, { id: memoModNextId.current++, text }]);
  }, []);

  const editMemoModification = useCallback((id, newText) => {
    setMemoModifications((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText } : m)));
  }, []);

  const deleteMemoModification = useCallback((id) => {
    setMemoModifications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /* Chart state */
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const handleCreateChart = useCallback((query) => {
    setChartLoading(true);
    setChartData(null);
    setActivePanel('chart');
    /* Generate dynamic chart sections based on query */
    const generated = generateChartSections(query);
    /* Simulate generation delay */
    setTimeout(() => {
      setChartData({ title: generated.title, query, sections: generated.sections });
      setChartLoading(false);
    }, 3000);
  }, []);

  const modifyCtx = useMemo(() => ({
    activeModifyId, setActiveModifyId,
    modifications, addModification, editModification, deleteModification, clearModifications,
    applyingChanges, applyChanges, planVersion, viewingVersion,
    isViewingOldVersion: viewingVersion < planVersion,
    running, allStepsDone, activeAnalysisStep, setActiveAnalysisStep, runAllSteps, analysisSource,
    memoData, memoLoading, memoModifications, addMemoModification, editMemoModification, deleteMemoModification,
    chartData, chartLoading,
    openRename,
  }), [activeModifyId, modifications, addModification, editModification, deleteModification, clearModifications, applyingChanges, applyChanges, planVersion, viewingVersion, running, allStepsDone, activeAnalysisStep, runAllSteps, analysisSource, memoData, memoLoading, memoModifications, addMemoModification, editMemoModification, deleteMemoModification, chartData, chartLoading, openRename]);

  const nextCard = useCallback(() => {
    setActiveCard((prev) => (prev + 1) % TUTORIAL_CARDS.length);
  }, []);

  const prevCard = useCallback(() => {
    setActiveCard((prev) => (prev - 1 + TUTORIAL_CARDS.length) % TUTORIAL_CARDS.length);
  }, []);

  /* Auto-rotate cards every 3s unless paused */
  useEffect(() => {
    if (isPaused || (planReady && !applyingChanges)) return;
    const id = setInterval(nextCard, 3000);
    return () => clearInterval(id);
  }, [isPaused, planReady, applyingChanges, nextCard]);

  return (
    <>
    <ModifyContext.Provider value={modifyCtx}>
    <div className="wbc">
      {/* Sidebar */}
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

      {/* Left chat panel */}
      <div className="wbc__chat">
        {/* Chat header */}
        <div className="wbc__chat-header">
          <div className="wbc__chat-title-area" ref={titleDropdownRef}>
            <button
              type="button"
              className="wbc__chat-title-btn"
              onClick={() => setTitleDropdownOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={titleDropdownOpen}
            >
              <span className="wbc__chat-title">Q1 Pipeline Review</span>
              <span className={`wbc__chat-title-caret${titleDropdownOpen ? ' wbc__chat-title-caret--open' : ''}`}>
                <CaretDown size={12} weight="regular" color="var(--color-icon-medium)" />
              </span>
            </button>

            {titleDropdownOpen && (
              <div className="wbc__chat-title-dropdown" role="menu">
                <button
                  type="button"
                  className="wbc__chat-title-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setTitleDropdownOpen(false);
                    openRename('workbook', 'Q1 Pipeline Review');
                  }}
                >
                  <PencilSimpleLine size={16} weight="regular" color="var(--color-icon-dark)" />
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  className="wbc__chat-title-dropdown-item"
                  role="menuitem"
                  onClick={() => setTitleDropdownOpen(false)}
                >
                  <FolderPlus size={16} weight="regular" color="var(--color-icon-dark)" />
                  <span>Add to Project</span>
                </button>
                <button
                  type="button"
                  className="wbc__chat-title-dropdown-item"
                  role="menuitem"
                  onClick={() => setTitleDropdownOpen(false)}
                >
                  <Copy size={16} weight="regular" color="var(--color-icon-dark)" />
                  <span>Clone</span>
                </button>
              </div>
            )}
          </div>
          <div className="wbc__chat-header-actions">
            <Button
              variant="secondary"
              size="md"
              icon={FolderPlus}
              label="Save"
            />
            <Button
              variant="primary"
              size="md"
              icon={ShareNetwork}
            />
          </div>
        </div>

        {/* Message area */}
        <div className="wbc__messages">
          <GuidanceActionCard
            planReady={planReady}
            isActive={activePanel === 'plan'}
            onClick={() => setActivePanel('plan')}
            isLast={!(running || allStepsDone) && !memoData && !memoLoading && !chartData && !chartLoading}
          />
          {(running || allStepsDone) && (
            <AnalysisActionCard
              isActive={activePanel === 'analysis'}
              onClick={() => setActivePanel('analysis')}
              isLast={!memoData && !memoLoading && !chartData && !chartLoading}
            />
          )}
          {(memoData || memoLoading) && (
            <MemoActionCard
              title={memoData ? memoData.title : 'Generating memo...'}
              isActive={activePanel === 'memo'}
              onClick={() => setActivePanel('memo')}
              isLast={!chartData && !chartLoading}
            />
          )}
          {(chartData || chartLoading) && (
            <ChartActionCard
              title={chartData ? `Chart: ${chartData.title}` : 'Generating chart...'}
              count={chartData ? chartData.sections.length : 0}
              isActive={activePanel === 'chart'}
              onClick={() => setActivePanel('chart')}
              isLast={true}
            />
          )}
        </div>

        {/* Text box */}
        <div className="wbc__chat-footer">
          <ChatTextBox active={planReady && !applyingChanges && !running} analysisReady={allStepsDone} onGenerateMemo={handleGenerateMemo} onCreateChart={handleCreateChart} />
        </div>
      </div>

      {/* Right panel */}
      {activePanel === 'chart' && (chartData || chartLoading) ? (
        <ChartPanel />
      ) : activePanel === 'memo' && (memoData || memoLoading) ? (
        <MemoPanel />
      ) : activePanel === 'analysis' && (running || allStepsDone) ? (
        <AnalysisPanel />
      ) : (
      <div className="wbc__panel">
        {/* Panel header */}
        <div className="wbc__panel-header">
          <div className="wbc__panel-title-area">
            <ListMagnifyingGlass size={22} weight="regular" />
            <span className="wbc__panel-title">Plan 1: {PLAN_TITLE}</span>
          </div>
          <div className="wbc__panel-header-right">
            <ListDropdown
              options={Array.from({ length: planVersion }, (_, i) => ({
                value: i + 1,
                label: `v${i + 1}${i + 1 === planVersion ? ' . Latest' : ''}`,
              }))}
              value={viewingVersion}
              onChange={setViewingVersion}
              disabled={planVersion <= 1}
            />
            <div className="wbc__history-wrapper">
              <button
                className="wbc__history-btn"
                disabled={planVersion <= 1}
                onClick={() => planVersion > 1 && setShowingDiff((d) => !d)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z" /></svg>
              </button>
              {planVersion > 1 && (
                <Tooltip name="View Changes" size="sm" icon={false} className="wbc__history-tooltip" />
              )}
            </div>
          </div>
        </div>

        {planReady && !applyingChanges ? (
          <>
            {/* Panel body — plan steps */}
            <div className="wbc__panel-body wbc__panel-body--plan">
              {showingDiff ? <PlanDiffContent /> : <PlanContent />}
              {viewingVersion < planVersion && !showingDiff && (
                <div className="wbc__old-version-banner">
                  <Eye size={18} weight="regular" color="var(--color-primary-500)" />
                  <span className="text-body-1-regular">
                    You're viewing an older version of this plan. To make changes, switch to the latest version.
                  </span>
                </div>
              )}
              {showingDiff && (
                <div className="wbc__diff-banner">
                  <ArrowCounterClockwise size={16} weight="regular" color="var(--color-primary-500)" />
                  <span className="text-body-1-regular">
                    You're viewing changes from the previous version.
                  </span>
                  <button
                    className="wbc__diff-banner-close"
                    type="button"
                    onClick={() => setShowingDiff(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Plan footer */}
            <PlanFooter />
          </>
        ) : planReady && applyingChanges ? (
          <>
            {/* Panel body — applying modifications loader */}
            <div className="wbc__panel-body">
              <CardLoaderAnimation
                activeIndex={activeCard}
                onPrev={prevCard}
                onNext={nextCard}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused((p) => !p)}
              />
              <div className="wbc__getting-ready">
                <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={16} height={16} />
                <span className="wbc__getting-ready-text">Applying modifications...</span>
              </div>
            </div>

            {/* Panel footer — applying */}
            <PlanFooter />
          </>
        ) : (
          <>
            {/* Panel body — loading state */}
            <div className="wbc__panel-body">
              <CardLoaderAnimation
                activeIndex={activeCard}
                onPrev={prevCard}
                onNext={nextCard}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused((p) => !p)}
              />
              <div className="wbc__getting-ready">
                <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={16} height={16} />
                <span className="wbc__getting-ready-text">Getting ready...</span>
              </div>
            </div>

            {/* Panel footer — loading */}
            <div className="wbc__panel-footer">
              <div className="wbc__footer-status">
                <img src={spinnerGif} alt="Loading" className="wbc__spinner-gif" width={20} height={20} />
                <span className="wbc__footer-status-text">Building plan...</span>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={Square}
                iconWeight="fill"
                label="Stop"
              />
            </div>
          </>
        )}
      </div>
      )}
    </div>
    </ModifyContext.Provider>

      {/* Rename dialog */}
      {renameDialog && (
        <div className="wbc__dialog-overlay">
          <Dialog
            size="sm"
            state="default"
            title={RENAME_LABELS[renameDialog.type].title}
            cancelLabel="Cancel"
            confirmLabel="Rename"
            onClose={() => setRenameDialog(null)}
            onCancel={() => setRenameDialog(null)}
            onConfirm={() => setRenameDialog(null)}
          >
            <TextInput
              label={RENAME_LABELS[renameDialog.type].label}
              placeholder={RENAME_LABELS[renameDialog.type].placeholder}
              value={renameDialog.value}
              onChange={(e) => setRenameDialog((prev) => ({ ...prev, value: e.target.value }))}
            />
          </Dialog>
        </div>
      )}
    </>
  );
}
