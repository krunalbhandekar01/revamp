import {
  Banknote,
  BookOpen,
  ClipboardList,
  FileSignature,
  Handshake,
  History,
  KanbanSquare,
  LifeBuoy,
  Target,
  UploadCloud,
  Workflow,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Coins,
  FileWarning,
  Gauge,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Gated on `can(module, action)`. Hidden entirely when not permitted. */
  module: string;
  /** Match this path exactly. Needed for index routes whose children share the prefix. */
  end?: boolean;
  action?: string;
  /** Shown as a count chip; wired to live data by the shell. */
  badgeKey?: 'exceptions' | 'unmatched' | 'queue' | 'leads' | 'activities' | 'tickets';
  description?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Navigation is generated from permissions, not hand-maintained per role.
 * An item the user cannot use is not rendered — the legacy panel's
 * `isMenuAllowed` had to special-case eleven parent menus by hand.
 */
export const NAV: NavSection[] = [
  {
    label: 'Decide',
    items: [
      {
        label: 'Fund Allocation',
        to: '/treasury/allocation',
        icon: Coins,
        module: 'treasury',
        badgeKey: 'queue',
        description: 'Who gets paid today, and why',
      },
      {
        label: 'Cash Position',
        to: '/treasury/cash',
        icon: Wallet,
        module: 'treasury',
        description: 'Balances, facilities and the 21-day forecast',
      },
      {
        label: 'Reconciliation',
        to: '/reconciliation',
        icon: RefreshCw,
        module: 'reconciliation',
        badgeKey: 'unmatched',
        description: 'Zoho Books sync health and unmatched items',
      },
    ],
  },
  {
    label: 'Dashboards',
    items: [
      { label: 'Finance', to: '/dashboard/finance', icon: CircleDollarSign, module: 'financeDashboard' },
      { label: 'Sales', to: '/dashboard/sales', icon: LayoutDashboard, module: 'salesDashboard' },
      { label: 'Sourcing', to: '/dashboard/sourcing', icon: Sprout, module: 'salesDashboard' },
      { label: 'Marketing', to: '/dashboard/marketing', icon: Megaphone, module: 'marketingDashboard' },
    ],
  },
  {
    label: 'Operate',
    items: [
      {
        label: 'Exceptions',
        to: '/exceptions',
        icon: FileWarning,
        module: 'dispatch',
        badgeKey: 'exceptions',
        description: 'The work queue: what needs a human today',
      },
      { label: 'Dispatches', to: '/dispatches', icon: Truck, module: 'dispatch' },
      { label: 'Orders', to: '/orders', icon: PackageSearch, module: 'order' },
      { label: 'Delivery Planner', to: '/schedules', icon: CalendarRange, module: 'schedule' },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Receivables', to: '/receivables', icon: Receipt, module: 'payment' },
      { label: 'Payments', to: '/payments', icon: Banknote, module: 'payment' },
    ],
  },
  {
    label: 'Sell',
    items: [
      {
        label: 'CRM Overview',
        to: '/crm',
        icon: Target,
        module: 'deal',
        end: true,
        description: 'Funnel, forecast, win/loss and rep performance',
      },
      {
        label: 'Leads',
        to: '/crm/leads',
        icon: Users,
        module: 'lead',
        badgeKey: 'leads',
        description: 'Scored, qualified and converted',
      },
      {
        label: 'Deals',
        to: '/crm/deals',
        icon: KanbanSquare,
        module: 'deal',
        description: 'Drag-and-drop pipeline',
      },
      {
        label: 'Quotations',
        to: '/crm/quotes',
        icon: FileSignature,
        module: 'quote',
        description: 'Build, discount, approve and send',
      },
      {
        label: 'Activities',
        to: '/crm/activities',
        icon: ClipboardList,
        module: 'activity',
        badgeKey: 'activities',
        description: 'Tasks, calls, meetings and follow-ups',
      },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Companies', to: '/crm/companies', icon: Handshake, module: 'contact' },
      { label: 'Contacts', to: '/crm/contacts', icon: Users, module: 'contact' },
      { label: 'Businesses', to: '/business', icon: Building2, module: 'business' },
    ],
  },
  {
    label: 'Engage',
    items: [
      {
        label: 'Support Tickets',
        to: '/support/tickets',
        icon: LifeBuoy,
        module: 'ticket',
        badgeKey: 'tickets',
        description: 'SLA-ordered complaint queue',
      },
      { label: 'Campaigns', to: '/crm/campaigns', icon: Megaphone, module: 'campaign' },
    ],
  },
  {
    label: 'Administer',
    items: [
      {
        label: 'Team & Access',
        to: '/manage/team',
        icon: ShieldCheck,
        module: 'team',
        description: 'Roles, permissions and the override diff',
      },
      {
        label: 'Automation',
        to: '/manage/automation',
        icon: Workflow,
        module: 'automation',
        description: 'Workflow, assignment and escalation rules',
      },
      { label: 'Catalogue', to: '/manage/catalogue', icon: BookOpen, module: 'catalog' },
      { label: 'Data Import', to: '/manage/import', icon: UploadCloud, module: 'dataImport' },
      { label: 'Audit Log', to: '/manage/audit', icon: History, module: 'audit' },
      { label: 'Job Health', to: '/manage/jobs', icon: Gauge, module: 'jobs' },
    ],
  },
];

/** Flat list, for the command palette. */
export const NAV_FLAT: NavItem[] = NAV.flatMap((s) => s.items);
