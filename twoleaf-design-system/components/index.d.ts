import type * as React from 'react';

export type IconName = 'home' | 'leaf' | 'scale' | 'users' | 'chart' | 'file' | 'alert' | 'check' | 'info' | 'settings' | 'sun' | 'moon' | 'copy' | 'map' | 'logout';
export interface IconProps { name: IconName; size?: number | string; label?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  fullWidth?: boolean;
  /** Renders an <a> instead of a <button>. */
  href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface BadgeProps { tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; children?: React.ReactNode; className?: string }
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface IdTagProps { value: string; copyable?: boolean; className?: string }
export declare function IdTag(props: IdTagProps): React.ReactElement;

export interface CardProps { title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function Card(props: CardProps): React.ReactElement;

export interface StatCardProps { label: string; value: React.ReactNode; unit?: string; delta?: number; deltaLabel?: string; className?: string }
export declare function StatCard(props: StatCardProps): React.ReactElement;

export interface QualityMeterProps { value: number; target?: number; label?: string; className?: string }
export declare function QualityMeter(props: QualityMeterProps): React.ReactElement;

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; error?: string }
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface AlertProps { tone?: 'success' | 'warning' | 'danger' | 'info'; title?: string; children?: React.ReactNode; className?: string }
export declare function Alert(props: AlertProps): React.ReactElement;

export interface DataTableColumn<R = any> { key: string; label: string; align?: 'left' | 'right'; render?: (row: R) => React.ReactNode }
export interface DataTableProps<R = any> { columns: DataTableColumn<R>[]; rows: R[]; caption?: string }
export declare function DataTable(props: DataTableProps): React.ReactElement;

export interface ThemeToggleProps { value?: 'light' | 'dark'; onChange?: (theme: 'light' | 'dark') => void; className?: string }
export declare function ThemeToggle(props: ThemeToggleProps): React.ReactElement;

export interface SidebarItem { label: string; icon?: IconName; href?: string; active?: boolean; count?: number }
export interface SidebarGroup { label?: string; items: SidebarItem[] }
export interface SidebarProps {
  /** The tenant's name: county or factory. */
  orgName: string;
  orgSubtitle?: string;
  /** The factory's own logo. The only brand element a factory can change. Falls back to initials. */
  logoUrl?: string;
  groups: SidebarGroup[];
  footer?: React.ReactNode;
  poweredByHref?: string;
  className?: string;
}
export declare function Sidebar(props: SidebarProps): React.ReactElement;

export interface PoweredByProps { href?: string; className?: string }
export declare function PoweredBy(props: PoweredByProps): React.ReactElement;

export interface FooterProps { links?: { label: string; href?: string }[]; poweredByHref?: string; className?: string }
export declare function Footer(props: FooterProps): React.ReactElement;

declare global {
  interface Window {
    TwoLeaf: {
      Icon: typeof Icon; Button: typeof Button; Badge: typeof Badge; IdTag: typeof IdTag; Card: typeof Card;
      StatCard: typeof StatCard; QualityMeter: typeof QualityMeter; TextField: typeof TextField; Alert: typeof Alert;
      DataTable: typeof DataTable; ThemeToggle: typeof ThemeToggle; Sidebar: typeof Sidebar; PoweredBy: typeof PoweredBy; Footer: typeof Footer;
    };
  }
}
