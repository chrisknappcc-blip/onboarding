import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Tile({ number, label, to }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-navy hover:bg-navy-dark transition-colors"
    >
      <span className="inline-flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-accent bg-white/10 px-1.5 py-0.5 rounded">
          {String(number).padStart(2, '0')}
        </span>
        <span className="text-sm font-medium text-white">{label}</span>
      </span>
      <ArrowRight size={16} className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
