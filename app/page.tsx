'use client';

import { useRef, useState } from 'react';

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [count, setCount] = useState(2);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  function handleFileChange(selected: File | null) {
    setFile(selected);
    setResults([]);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please choose a photo first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('count', String(count));
      if (prompt.trim()) formData.append('prompt', prompt.trim());

      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setResults(data.images as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>MarketplaceAI</h1>
      <p className="subtitle">Upload a photo, choose how many improved versions you want, and download the results.</p>

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
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>Click to upload a photo</p>
          )}
          {previewUrl && <img className="preview" src={previewUrl} alt="Selected preview" />}
        </div>

        <div className="field">
          <label htmlFor="count">Number of improved photos</label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="prompt">Custom instructions (optional)</label>
          <textarea
            id="prompt"
            placeholder="e.g. brighten the photo, use a clean white background"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={loading || !file}>
          {loading ? 'Generating…' : 'Generate improved photos'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      {results.length > 0 && (
        <div className="card">
          <h2>Results</h2>
          <div className="results-grid">
            {results.map((src, i) => (
              <div className="result-item" key={i}>
                <img src={src} alt={`Improved photo ${i + 1}`} />
                <a href={src} download={`marketplaceai-${i + 1}.png`}>
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
