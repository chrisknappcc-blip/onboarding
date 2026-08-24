import { NavLink } from 'react-router-dom';
import {
  Home, BookOpen, MousePointerClick, PlayCircle,
  LayoutGrid, Globe, ListChecks, Users2, ShieldCheck
} from 'lucide-react';

const ICONS = {
  BookOpen, MousePointerClick, PlayCircle, LayoutGrid, Globe, ListChecks
};

// Metro/Windows Phone tiles cycle through the brand palette rather than
// every tile being the same color - that alternating color-block look is
// the whole visual signature of that style.
const TILE_COLORS = ['bg-navy', 'bg-ccblue', 'bg-teal', 'bg-lime'];

function Tile({ to, label, Icon, colorClass, wide, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex flex-col justify-between p-3 ${colorClass} text-white transition-transform hover:scale-[0.97] active:scale-[0.94] ${
          wide ? 'col-span-2 aspect-[3.6/1]' : 'aspect-square'
        } ${isActive ? 'ring-4 ring-white ring-inset' : ''}`
      }
    >
      <Icon size={22} strokeWidth={1.75} className="text-white/90" />
      <span className="text-sm font-medium leading-tight text-white">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ track, hasTeamAccess, isAdmin }) {
  let colorIdx = 0;
  const nextColor = () => TILE_COLORS[colorIdx++ % TILE_COLORS.length];

  return (
    <aside className="w-1/4 min-w-[220px] max-w-[340px] shrink-0 bg-white border-r border-border flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <span className="font-display font-semibold text-navy">
          <span className="text-lime">care</span>
          <span className="text-teal">continuity</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Tile to="/" label="Home" Icon={Home} colorClass={nextColor()} wide end />
          {track.sections.map((s) => (
            <Tile
              key={s.key}
              to={`/${s.key}`}
              label={s.label}
              Icon={ICONS[s.icon] || Home}
              colorClass={nextColor()}
            />
          ))}
        </div>

        {hasTeamAccess && (
          <>
            <div className="pt-4 pb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
              Team
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Tile to="/team-progress" label="Team Progress" Icon={Users2} colorClass={nextColor()} />
              {isAdmin && (
                <Tile to="/team-admin" label="Manage Access" Icon={ShieldCheck} colorClass={nextColor()} />
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
