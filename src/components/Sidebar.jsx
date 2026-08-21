import { NavLink } from 'react-router-dom';
import {
  Home, BookOpen, MousePointerClick, PlayCircle,
  LayoutGrid, Globe, ListChecks, Users
} from 'lucide-react';

const ICONS = {
  BookOpen, MousePointerClick, PlayCircle, LayoutGrid, Globe, ListChecks
};

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand/10 text-brand'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ track, isManager }) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-gray-200">
        <span className="font-semibold text-gray-900">Onboarding Hub</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItem to="/" label="Home" Icon={Home} />
        {track.sections.map((s) => (
          <NavItem key={s.key} to={`/${s.key}`} label={s.label} Icon={ICONS[s.icon] || Home} />
        ))}
        {isManager && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold uppercase text-gray-400">
              Manager
            </div>
            <NavItem to="/team-progress" label="Team Progress" Icon={Users} />
          </>
        )}
      </nav>
    </aside>
  );
}
