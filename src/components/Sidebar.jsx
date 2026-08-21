import { NavLink } from 'react-router-dom';
import {
  Home, BookOpen, MousePointerClick, PlayCircle,
  LayoutGrid, Globe, ListChecks, Users2, ShieldCheck
} from 'lucide-react';

const ICONS = {
  BookOpen, MousePointerClick, PlayCircle, LayoutGrid, Globe, ListChecks
};

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
          isActive ? 'bg-navy/[0.07] text-navy' : 'text-ink-500 hover:bg-ink-900/[0.04] hover:text-ink-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
          <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ track, hasTeamAccess, isAdmin }) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-white flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center mr-2.5">
          <span className="text-white font-display font-semibold text-sm">O</span>
        </div>
        <span className="font-display font-semibold text-ink-900">Onboarding Hub</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        <NavItem to="/" label="Home" Icon={Home} />
        {track.sections.map((s) => (
          <NavItem key={s.key} to={`/${s.key}`} label={s.label} Icon={ICONS[s.icon] || Home} />
        ))}
        {hasTeamAccess && (
          <>
            <div className="pt-5 pb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
              Team
            </div>
            <NavItem to="/team-progress" label="Team Progress" Icon={Users2} />
            {isAdmin && <NavItem to="/team-admin" label="Manage Access" Icon={ShieldCheck} />}
          </>
        )}
      </nav>
    </aside>
  );
}
