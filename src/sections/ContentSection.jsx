import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Shared shell for sections that are just "fetch some content, render it".
// Content shape from get-content.js: { title, blocks: [{ type: 'text'|'link'|'video', ... }] }
export default function ContentSection({ trackKey, section, emptyLabel }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getContent(trackKey, section)
      .then((data) => !cancelled && setContent(data))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [trackKey, section]);

  if (error) return <p className="text-sm text-red-600">Couldn't load this section: {error}</p>;
  if (!content) return <p className="text-sm text-gray-400">Loading...</p>;

  if (!content.blocks || content.blocks.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-900">{content.title}</h1>
        <p className="mt-4 text-sm text-gray-400">
          {emptyLabel || 'Content for this section is on the way.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">{content.title}</h1>
      <div className="mt-6 space-y-4">
        {content.blocks.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

function ContentBlock({ block }) {
  if (block.type === 'text') {
    return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{block.text}</p>;
  }
  if (block.type === 'link') {
    return (
      <a href={block.url} target="_blank" rel="noreferrer"
         className="block p-3 bg-white border border-gray-200 rounded-lg text-sm text-brand hover:border-brand/40">
        {block.label || block.url}
      </a>
    );
  }
  if (block.type === 'video') {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe src={block.embedUrl} title={block.label || 'video'} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return null;
}
