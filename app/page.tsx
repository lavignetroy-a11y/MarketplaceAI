'use client';

import { useEffect, useRef, useState } from 'react';

const MAX_FILES = 30;
const COUNT_OPTIONS = [4, 6, 8, 10] as const;
const POLL_INTERVAL_MS = 3000;

type ShotResult = {
  sequenceNumber: number;
  imageRole: string;
  imageJob: string;
  status: 'done' | 'error';
  image?: string;
  error?: string;
};

type CampaignStatus =
  | 'queued'
  | 'analyzing'
  | 'needs_more_evidence'
  | 'generating_hero'
  | 'generating'
  | 'packaging'
  | 'completed'
  | 'incomplete'
  | 'failed';

type CampaignState = {
  id: string;
  status: CampaignStatus;
  statusLabel: string;
  statusMessage?: string;
  productSummary: { category: string; itemType: string; quantity: number; campaignThesis: string } | null;
  minimumAdditionalEvidenceNeeded: string[];
  results: ShotResult[];
  listingTitle: string | null;
  listingDescription: string | null;
  error: string | null;
};

const TERMINAL_STATUSES: CampaignStatus[] = ['needs_more_evidence', 'completed', 'incomplete', 'failed'];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(6);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);

  useEffect(() => {
    if (!campaign || TERMINAL_STATUSES.includes(campaign.status)) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to check status.');
        setCampaign(data as CampaignState);
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Failed to check status.');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [campaign]);

  function handleFileChange(selected: FileList | null) {
    if (!selected) return;
    const incoming = Array.from(selected);
    const combined = [...files, ...incoming];

    if (combined.length > MAX_FILES) {
      setGlobalError(`You can upload up to ${MAX_FILES} photos. Only the first ${MAX_FILES} were kept.`);
    } else {
      setGlobalError(null);
    }

    setFiles(combined.slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setGlobalError('Please upload at least one photo of the item.');
      return;
    }

    setSubmitting(true);
    setGlobalError(null);
    setCampaign(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));
      formData.append('count', String(count));
      if (notes.trim()) formData.append('notes', notes.trim());

      const res = await fetch('/api/campaigns', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setCampaign({
        id: data.jobId,
        status: 'queued',
        statusLabel: 'Preparing your campaign',
        productSummary: null,
        minimumAdditionalEvidenceNeeded: [],
        results: [],
        listingTitle: null,
        listingDescription: null,
        error: null,
      });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const isProcessing = campaign !== null && !TERMINAL_STATUSES.includes(campaign.status);

  return (
    <main>
      <h1>MarketplaceAI</h1>
      <p className="subtitle">
        Upload photos of one item (up to {MAX_FILES}), choose your package size, and get a
        coordinated, truthful listing photo campaign back.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="dropzone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
          />
          {files.length > 0 ? (
            <p>
              {files.length} photo{files.length > 1 ? 's' : ''} of this item selected
            </p>
          ) : (
            <p>Click to upload photos of the item (up to {MAX_FILES})</p>
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
          <label htmlFor="count">Package size</label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value) as typeof count)}>
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} final images
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="notes">Seller notes (optional)</label>
          <textarea
            id="notes"
            placeholder="e.g. brand, model, known defects, what's included, preferred setting"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={submitting || isProcessing || files.length === 0}>
          {submitting ? 'Starting…' : 'Generate my listing campaign'}
        </button>

        {globalError && <p className="error">{globalError}</p>}
      </form>

      {campaign && (
        <div className="card">
          <h2>{campaign.statusLabel}</h2>
          {isProcessing && <p className="status">This can take a few minutes — feel free to leave this open.</p>}
          {campaign.statusMessage && <p className="status">{campaign.statusMessage}</p>}

          {campaign.status === 'needs_more_evidence' && campaign.minimumAdditionalEvidenceNeeded.length > 0 && (
            <ul>
              {campaign.minimumAdditionalEvidenceNeeded.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}

          {campaign.status === 'failed' && campaign.error && <p className="error">{campaign.error}</p>}

          {campaign.productSummary && (
            <p className="status">
              Identified: {campaign.productSummary.itemType} ({campaign.productSummary.category}), qty{' '}
              {campaign.productSummary.quantity}
            </p>
          )}

          {campaign.results.length > 0 && (
            <div className="results-grid">
              {campaign.results.map((r) => (
                <div className="result-item" key={r.sequenceNumber}>
                  {r.status === 'error' && (
                    <p className="error">
                      {r.imageRole}: {r.error}
                    </p>
                  )}
                  {r.status === 'done' && r.image && (
                    <>
                      <img src={r.image} alt={r.imageJob} />
                      <a href={r.image} download={`${r.sequenceNumber}-${r.imageRole}.png`}>
                        Download
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {campaign.listingTitle && (
            <div className="field">
              <label>Listing title</label>
              <p>{campaign.listingTitle}</p>
            </div>
          )}

          {campaign.listingDescription && (
            <div className="field">
              <label>Listing description</label>
              <p style={{ whiteSpace: 'pre-wrap' }}>{campaign.listingDescription}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
