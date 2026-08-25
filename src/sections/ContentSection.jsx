import { useEffect, useMemo, useState } from 'react';
import { Search, X, Link as LinkIcon, FileText, FileSpreadsheet, Presentation, ChevronDown, Download } from 'lucide-react';
import { api } from '../lib/api.js';
import { useIdentity } from '../lib/identity.jsx';

// Shared shell for sections that are just "fetch some content, render it".
// Content shape from get-content.js: { title, blocks: [{ type: 'text'|'link'|'video', ... }] }
export default function ContentSection({ trackKey, section, emptyLabel, searchable }) {
  const { managerId, team } = useIdentity();
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getContent(trackKey, section, managerId, team)
      .then((data) => !cancelled && setContent(data))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [trackKey, section, managerId, team]);

  const filteredBlocks = useMemo(() => {
    if (!content?.blocks) return [];
    const q = query.trim().toLowerCase();
    if (!q) return content.blocks;
    return content.blocks.filter((b) => {
      const haystack = [b.text, b.label, b.url].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [content, query]);

  if (error) return <p className="text-sm text-red-600">Couldn't load this section: {error}</p>;
  if (!content) return <p className="text-sm text-ink-300">Loading...</p>;

  const hasContent = content.blocks && content.blocks.length > 0;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-xl font-semibold text-ink-900">{content.title}</h1>

      {searchable && hasContent && (
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${content.title.toLowerCase()}...`}
            className="w-full border border-border bg-card rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {!hasContent ? (
        <div className="mt-6 p-8 bg-card border border-dashed border-border rounded-xl text-center">
          <p className="text-sm text-ink-300">
            {emptyLabel || 'Content for this section is on the way.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {filteredBlocks.length === 0 ? (
            <p className="text-sm text-ink-300">No matches for "{query}".</p>
          ) : (
            filteredBlocks.map((block, i) => <ContentBlock key={i} block={block} query={query} />)
          )}
        </div>
      )}
    </div>
  );
}

export function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/25 text-ink-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// Lightweight formatting for text blocks: **bold** and __underline__.
// Deliberately not full markdown - just the two things people actually
// reach for when writing playbook content.
function renderFormattedText(text, query) {
  const parts = text.split(/(\*\*.+?\*\*|__.+?__)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-ink-900">{highlight(part.slice(2, -2), query)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <u key={i}>{highlight(part.slice(2, -2), query)}</u>;
    }
    return <span key={i}>{highlight(part, query)}</span>;
  });
}

function faviconFor(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch {
    return null;
  }
}

export function iconForFile(fileName) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['ppt', 'pptx'].includes(ext)) return Presentation;
  return FileText;
}

function formatFileSize(fileName) {
  const ext = (fileName || '').split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

export function officeExt(fileName) {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes((fileName || '').split('.').pop()?.toLowerCase());
}
function isPdf(fileName) {
  return (fileName || '').split('.').pop()?.toLowerCase() === 'pdf';
}
function isPlainText(fileName) {
  return ['txt', 'csv'].includes((fileName || '').split('.').pop()?.toLowerCase());
}

function FileBlock({ block, query }) {
  const [expanded, setExpanded] = useState(true);
  const [textContent, setTextContent] = useState(null);
  const Icon = iconForFile(block.fileName);
  const absoluteUrl = `${window.location.origin}${block.url}`;
  const downloadUrl = `${block.url}&download=1`;

  useEffect(() => {
    if (expanded && isPlainText(block.fileName) && textContent === null) {
      fetch(block.url).then((r) => r.text()).then(setTextContent).catch(() => setTextContent('Could not load preview.'));
    }
  }, [expanded]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex gap-3 p-3.5 text-left hover:bg-surface/60 transition-colors">
        <div className="w-11 h-11 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-navy truncate">{highlight(block.label || block.fileName, query)}</p>
          {block.description && (
            <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{highlight(block.description, query)}</p>
          )}
          <p className="text-[11px] text-ink-300 mt-0.5">{formatFileSize(block.fileName)} · {block.fileName}</p>
        </div>
        <ChevronDown size={16} className={`text-ink-300 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {isPdf(block.fileName) ? (
            <iframe src={block.url} title={block.fileName} className="w-full h-[85vh]" />
          ) : officeExt(block.fileName) ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`}
              title={block.fileName}
              className="w-full h-[85vh]"
            />
          ) : isPlainText(block.fileName) ? (
            <pre className="p-4 text-xs text-ink-700 whitespace-pre-wrap max-h-[75vh] overflow-y-auto">{textContent || 'Loading...'}</pre>
          ) : (
            <p className="p-4 text-sm text-ink-300">Preview isn't available for this file type — use download instead.</p>
          )}
          <div className="p-3 border-t border-border bg-surface/50">
            <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy-dark">
              <Download size={14} /> Download {block.fileName}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContentBlock({ block, query }) {
  if (block.type === 'text') {
    return (
      <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
        {renderFormattedText(block.text, query)}
      </p>
    );
  }
  if (block.type === 'file') {
    return <FileBlock block={block} query={query} />;
  }
  if (block.type === 'link') {
    const thumb = block.thumbnail || faviconFor(block.url);
    let domain = '';
    try { domain = new URL(block.url).hostname; } catch {}
    return (
      <a href={block.url} target="_blank" rel="noreferrer"
         className="flex gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-navy/30 transition-colors">
        <div className="w-11 h-11 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden">
          {thumb ? (
            <img src={thumb} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <LinkIcon size={18} className="text-ink-300" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy truncate">{highlight(block.label || block.url, query)}</p>
          {block.description && (
            <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{highlight(block.description, query)}</p>
          )}
          {domain && <p className="text-[11px] text-ink-300 mt-0.5">{domain}</p>}
        </div>
      </a>
    );
  }
  if (block.type === 'video') {
    return (
      <div className="aspect-video bg-ink-900 rounded-xl overflow-hidden">
        <iframe src={block.embedUrl} title={block.label || 'video'} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  if (block.type === 'table') {
    return (
      <div>
        {block.title && <p className="text-xs font-semibold uppercase tracking-wide text-ink-300 mb-2">{block.title}</p>}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {(block.rows || []).map((row, i) => (
            <div key={i} className={`px-4 py-3.5 ${i !== block.rows.length - 1 ? 'border-b border-border' : ''}`}>
              <p className="text-sm font-semibold text-ink-900">{row.label}</p>
              {row.sublabel && <p className="text-xs text-navy font-medium mt-0.5">{row.sublabel}</p>}
              {row.description && <p className="text-sm text-ink-700 mt-1 leading-relaxed">{row.description}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
