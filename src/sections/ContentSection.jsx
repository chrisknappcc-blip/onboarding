import { useEffect, useMemo, useRef, useState } from 'react';
import mammoth from 'mammoth';
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
  const [fileTexts, setFileTexts] = useState({});

  useEffect(() => {
    let cancelled = false;
    api.getContent(trackKey, section, managerId, team)
      .then((data) => !cancelled && setContent(data))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [trackKey, section, managerId, team]);

  // Search can't see inside an embedded Office viewer iframe (that content
  // lives on Microsoft's servers, not ours) - so for uploaded .docx files,
  // pull the actual text out client-side once, and search that instead.
  useEffect(() => {
    if (!searchable || !content?.blocks) return;
    content.blocks.forEach((b, i) => {
      const key = b.id || i;
      if (b.type === 'file' && b.fileName?.toLowerCase().endsWith('.docx') && !(key in fileTexts)) {
        fetch(b.url)
          .then((r) => r.arrayBuffer())
          .then((buf) => mammoth.extractRawText({ arrayBuffer: buf }))
          .then((res) => setFileTexts((prev) => ({ ...prev, [key]: res.value })))
          .catch(() => setFileTexts((prev) => ({ ...prev, [key]: '' })));
      }
    });
  }, [content, searchable]);

  const filteredBlocks = useMemo(() => {
    if (!content?.blocks) return [];
    const q = query.trim().toLowerCase();
    if (!q) return content.blocks.map((b) => ({ block: b, matchedInDoc: false }));
    return content.blocks
      .map((b, i) => {
        const key = b.id || i;
        const surfaceHaystack = [b.text, b.label, b.url, b.description, b.fileName].filter(Boolean).join(' ').toLowerCase();
        const docText = (fileTexts[key] || '').toLowerCase();
        const matchesSurface = surfaceHaystack.includes(q);
        const matchesDoc = docText.includes(q);
        return { block: b, matchedInDoc: !matchesSurface && matchesDoc, matches: matchesSurface || matchesDoc };
      })
      .filter((entry) => entry.matches);
  }, [content, query, fileTexts]);

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
            filteredBlocks.map((entry, i) => (
              <ContentBlock key={i} block={entry.block} query={query} matchedInDoc={entry.matchedInDoc} />
            ))
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

const DOCX_STYLES = `
  .docx-preview h1, .docx-preview h2, .docx-preview h3 { font-weight: 600; margin: 1em 0 0.5em; color: #14181F; }
  .docx-preview h1 { font-size: 1.4em; } .docx-preview h2 { font-size: 1.2em; } .docx-preview h3 { font-size: 1.05em; }
  .docx-preview p { margin: 0.75em 0; }
  .docx-preview ul { list-style: disc; margin: 0.75em 0; padding-left: 1.5em; }
  .docx-preview ol { list-style: decimal; margin: 0.75em 0; padding-left: 1.5em; }
  .docx-preview li { margin: 0.25em 0; }
  .docx-preview strong { font-weight: 600; }
  .docx-preview table { border-collapse: collapse; margin: 1em 0; }
  .docx-preview td, .docx-preview th { border: 1px solid #E3E8EF; padding: 6px 10px; }
`;

// Renders the docx ourselves (instead of Microsoft's iframe viewer) so we
// can actually highlight search matches and jump between them - impossible
// with an embedded external viewer, since its content lives on Microsoft's
// servers and we have no access to it.
function DocxPreview({ url, query }) {
  const containerRef = useRef(null);
  const [html, setHtml] = useState(null);
  const [matchInfo, setMatchInfo] = useState({ count: 0, active: 0 });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((res) => !cancelled && setHtml(res.value))
      .catch(() => !cancelled && setHtml('<p>Could not render this document - try downloading it instead.</p>'));
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || html === null) return;
    container.innerHTML = html; // reset to a clean, unhighlighted state each time

    const q = query.trim();
    if (!q) { setMatchInfo({ count: 0, active: 0 }); return; }
    const qLower = q.toLowerCase();

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    const marks = [];
    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      const lower = text.toLowerCase();
      if (!lower.includes(qLower)) return;
      const frag = document.createDocumentFragment();
      let lastEnd = 0;
      let idx;
      let searchFrom = 0;
      while ((idx = lower.indexOf(qLower, searchFrom)) !== -1) {
        frag.appendChild(document.createTextNode(text.slice(lastEnd, idx)));
        const mark = document.createElement('mark');
        mark.className = 'bg-lime/50 rounded-sm';
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        marks.push(mark);
        lastEnd = idx + q.length;
        searchFrom = lastEnd;
      }
      frag.appendChild(document.createTextNode(text.slice(lastEnd)));
      textNode.parentNode.replaceChild(frag, textNode);
    });

    setMatchInfo({ count: marks.length, active: 0 });
    if (marks.length > 0) marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [html, query]);

  function jump(delta) {
    const marks = [...(containerRef.current?.querySelectorAll('mark') || [])];
    if (!marks.length) return;
    const next = (matchInfo.active + delta + marks.length) % marks.length;
    marks[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMatchInfo((prev) => ({ ...prev, active: next }));
  }

  if (html === null) {
    return <p className="p-4 text-sm text-ink-300">Loading preview...</p>;
  }

  return (
    <div>
      <style>{DOCX_STYLES}</style>
      {matchInfo.count > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-lime/10 border-b border-border">
          <span className="text-xs font-medium text-ink-700">
            {matchInfo.count} match{matchInfo.count !== 1 ? 'es' : ''} for "{query}"
          </span>
          <div className="flex gap-1.5">
            <button onClick={() => jump(-1)} className="px-2.5 py-1 text-xs font-medium bg-white border border-border rounded-md hover:bg-surface">Prev</button>
            <button onClick={() => jump(1)} className="px-2.5 py-1 text-xs font-medium bg-white border border-border rounded-md hover:bg-surface">Next</button>
          </div>
        </div>
      )}
      <div ref={containerRef} className="docx-preview p-6 max-h-[85vh] overflow-y-auto text-sm text-ink-700 leading-relaxed" />
    </div>
  );
}

function officeExt(fileName) {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes((fileName || '').split('.').pop()?.toLowerCase());
}
function isPdf(fileName) {
  return (fileName || '').split('.').pop()?.toLowerCase() === 'pdf';
}
function isPlainText(fileName) {
  return ['txt', 'csv'].includes((fileName || '').split('.').pop()?.toLowerCase());
}

function FileBlock({ block, query, matchedInDoc }) {
  const [expanded, setExpanded] = useState(true);
  const [textContent, setTextContent] = useState(null);
  const Icon = iconForFile(block.fileName);
  const absoluteUrl = `${window.location.origin}${block.url}`;
  const downloadUrl = `${block.url}&download=1`;
  const isDocx = block.fileName?.toLowerCase().endsWith('.docx');
  // Don't surface the raw uploaded filename as the card's title - it's
  // usually a messy internal document name, not something worth showing.
  // Only show a label if someone actually set a custom one.
  const displayLabel = block.label && block.label !== block.fileName ? block.label : 'Document';

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
          <p className="text-sm font-medium text-navy truncate">{highlight(displayLabel, query)}</p>
          {block.description && (
            <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{highlight(block.description, query)}</p>
          )}
          {matchedInDoc && (
            <p className="text-[11px] text-lime-dark font-medium mt-0.5">Matched inside this document</p>
          )}
        </div>
        <ChevronDown size={16} className={`text-ink-300 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {isPdf(block.fileName) ? (
            <iframe src={block.url} title={block.fileName} className="w-full h-[85vh]" />
          ) : isDocx ? (
            <DocxPreview url={block.url} query={query} />
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

export function ContentBlock({ block, query, matchedInDoc }) {
  if (block.type === 'text') {
    return (
      <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
        {renderFormattedText(block.text, query)}
      </p>
    );
  }
  if (block.type === 'file') {
    return <FileBlock block={block} query={query} matchedInDoc={matchedInDoc} />;
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
