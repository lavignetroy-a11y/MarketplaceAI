'use client';

import { useRef, useState } from 'react';

const MAX_FILES = 30;

type ResultItem = {
  fileName: string;
  status: 'pending' | 'done' | 'error';
  image?: string;
  error?: string;
};

async function generateOne(file: File, prompt: string): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);
  if (prompt.trim()) formData.append('prompt', prompt.trim());

  const res = await fetch('/api/generate', { method: 'POST', body: formData });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return (data.images as string[])[0];
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  function handleFileChange(selected: FileList | null) {
    if (!selected) return;
    const incoming = Array.from(selected);
    const combined = [...files, ...incoming];

    if (combined.length > MAX_FILES) {
      setGlobalError(`You can upload up to ${MAX_FILES} photos at a time. Only the first ${MAX_FILES} were kept.`);
    } else {
      setGlobalError(null);
    }

    setFiles(combined.slice(0, MAX_FILES));
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setGlobalError('Please choose at least one photo first.');
      return;
    }

    setLoading(true);
    setGlobalError(null);
    setProgress(0);
    setResults(files.map((f) => ({ fileName: f.name, status: 'pending' })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const image = await generateOne(file, prompt);
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'done', image } : r)),
        );
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: 'error', error: err instanceof Error ? err.message : 'Failed.' }
              : r,
          ),
        );
      }
      setProgress(i + 1);
    }

    setLoading(false);
  }

  return (
    <main>
      <h1>MarketplaceAI</h1>
      <p className="subtitle">
        Upload up to {MAX_FILES} photos and get back an improved version of each, ready to download.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
          />
          {files.length > 0 ? (
            <p>
              {files.length} photo{files.length > 1 ? 's' : ''} selected
            </p>
          ) : (
            <p>Click to upload photos (up to {MAX_FILES})</p>
          )}
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <div className="file-chip" key={`${f.name}-${i}`}>
                <span>{f.name}</span>
                <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="prompt">Custom instructions (optional, applied to every photo)</label>
          <textarea
            id="prompt"
            placeholder="e.g. brighten the photo, use a clean white background"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={loading || files.length === 0}>
          {loading
            ? `Generating ${progress}/${files.length}…`
            : `Generate improved photo${files.length > 1 ? 's' : ''}`}
        </button>

        {globalError && <p className="error">{globalError}</p>}
      </form>

      {results.length > 0 && (
        <div className="card">
          <h2>Results</h2>
          <div className="results-grid">
            {results.map((r, i) => (
              <div className="result-item" key={i}>
                {r.status === 'pending' && <p className="status">Waiting…</p>}
                {r.status === 'error' && <p className="error">{r.fileName}: {r.error}</p>}
                {r.status === 'done' && r.image && (
                  <>
                    <img src={r.image} alt={`Improved ${r.fileName}`} />
                    <a href={r.image} download={`marketplaceai-${i + 1}.png`}>
                      Download
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
