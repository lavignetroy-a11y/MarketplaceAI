/**
 * How many images generate at once during the paid phase.
 *
 * Not unbounded, for three reasons: a large set fired all at once walks straight into the image
 * API's rate limit (the studio run lost 32 images to exactly that), a bounded pool is what makes
 * the progress bar and the time estimate mean anything, and a failure part-way through costs one
 * wave rather than the whole set.
 */
export const GENERATION_CONCURRENCY = Math.max(
  1,
  Number(process.env.CAMPAIGN_CONCURRENCY) || 4,
);

/**
 * Seconds still expected, or null when nothing has finished yet and there is no basis to guess.
 * Images land roughly one wave at a time, so what remains is wave count times a measured wave.
 */
export function etaSeconds(
  p: CampaignProgress,
  concurrency = GENERATION_CONCURRENCY,
): number | null {
  const remaining = p.total - p.done - p.failed;
  if (remaining <= 0) return 0;
  if (p.avgSeconds === null) return null;
  return Math.round(Math.ceil(remaining / concurrency) * p.avgSeconds);
}

/** Any count within the pricing counter's range -- see lib/config/pricing.ts. */
export type RequestedImageCount = number;

import type { SubjectScope } from './categories';
import type { PresentationPlan } from './presentation';
import type { ProductLock } from './productLock';

export type ShotClassification = 'marketing' | 'evidence';

export type ShotOrientation = 'square' | 'portrait' | 'landscape';

/**
 * Image API quality tier. Production always ships 'high'; 'low' exists because it is roughly
 * thirty-five times cheaper, which makes it the sane way to check that a plan and a set of
 * prompts do what you expect before committing real money to the same run at full quality.
 */
export type ImageQuality = 'low' | 'medium' | 'high';

// source_edit: a specific original source photo already shows this shot's exact viewpoint, so
//   that ONE photo is edited directly (lighting/background/crop only). This is the strongest
//   guarantee against geometry errors (e.g. a mirrored/flipped steering wheel) because the model
//   is never asked to reconstruct structure -- it only touches what the prompt describes. Prefer
//   this mode whenever a matching source photo exists, especially for asymmetric mechanical
//   detail (controls, hardware, hinges) that full reconstruction is prone to getting backwards.
// hero_edit: the hero image itself is edited directly (same camera framing as the hero) --
//   this is what guarantees a pixel-identical background, since the edit only touches what
//   the prompt describes and leaves the rest of the hero image untouched.
// hero_reference: the shot needs a genuinely different camera angle/position than the hero (and
//   no single source photo already shows it), so a pixel-identical background isn't physically
//   coherent -- the hero is attached as one of several reference images purely for material/
//   lighting/palette consistency. Highest risk of geometry reconstruction errors; use sparingly.
// independent: generated fresh from the original source photos only, no hero involvement. Same
//   reconstruction risk as hero_reference, without a hero to match style to.
// known_product: drawn purely from knowledge of an identified mass-produced item, with NO
//   reference image -- the only mode that calls images.generate rather than images.edit. For a
//   view no photograph covers on a product whose exact model is known, this beats reconstruction
//   outright, because edit mode would anchor to unrelated pixels and invent the details. Valid
//   only for factory design, never for condition: a recalled panel is a NEW panel.
export type ProductionMode =
  | 'independent'
  | 'hero_edit'
  | 'hero_reference'
  | 'source_edit'
  | 'known_product';

export interface ShotPlan {
  sequenceNumber: number;
  imageRole: string;
  imageJob: string;
  classification: ShotClassification;
  productionMode: ProductionMode;
  // 0-based index into the uploaded source photos array. Required (non-null) only when
  // productionMode is "source_edit" -- identifies which exact original photo to edit.
  sourcePhotoIndex: number | null;
  /**
   * Which uploads to attach to THIS shot, 0-based. Attaching all of them puts every source's
   * garage, driveway and kitchen in front of the model at once, and it averages them.
   */
  referenceSourceIndices: number[];
  /** full_set establishes quantity, representative shows one unit whole, detail goes close in. */
  subjectScope: SubjectScope;
  /**
   * How much of this view came from the photographs.
   *   photographed    a source covers this view
   *   interpolated    completed from partly visible surfaces, symmetry, or continuous structure
   *   model_completed completed from knowledge of this identified mass-produced product
   * Anything past 'photographed' owes the seller a coverage note, so they know which images are
   * representations rather than photographs of their specific unit.
   */
  inferenceLevel: 'photographed' | 'interpolated' | 'model_completed';
  /** Where the photographer stands, relative to the item's fixed 12 o'clock front. */
  cameraPose: string;
  orientation: ShotOrientation;
  prompt: string;
  saveAs: string;
}

export interface ProductIdentity {
  category: string;
  itemType: string;
  quantity: number;
  isMatchingSet: boolean;
  brand: string | null;
  model: string | null;
  confirmedFacts: string[];
  probableFacts: string[];
  unsupportedFacts: string[];
}

export interface TruthLock {
  mustPreserve: string[];
  neverInvent: string[];
  neverRemove: string[];
}

export interface AnalysisResult {
  readyForGeneration: boolean;
  reasonNotReady: string;
  minimumAdditionalEvidenceNeeded: string[];
  productIdentity: ProductIdentity;
  conditionSummary: string[];
  truthLock: TruthLock;
  campaignThesis: string;
  /**
   * What keeps every image showing the same physical object. Read from the source photographs and
   * injected ahead of everything else in every prompt -- see lib/campaign/productLock.ts.
   */
  productLock: ProductLock;
  environmentDescription: string;
  /**
   * What ten minutes of the seller's own preparation looks like for this specific item, and which
   * real faults have to survive it. Injected into every shot's prompt -- see
   * lib/campaign/presentation.ts.
   */
  presentation: PresentationPlan;
  shots: ShotPlan[];
  listingTitle: string;
  listingDescription: string;
  /** Plain-language notes on shots that evidence could not support, and what replaced them. */
  coverageNotes: string[];
}

export type CampaignStatus =
  | 'queued'
  | 'analyzing'
  | 'needs_more_evidence'
  | 'generating_preview'
  // the free watermarked preview is ready and the campaign is waiting on payment
  | 'preview_ready'
  | 'generating'
  | 'packaging'
  | 'completed'
  | 'incomplete'
  | 'failed';

export interface GeneratedShotResult {
  sequenceNumber: number;
  imageRole: string;
  imageJob: string;
  status: 'done' | 'error';
  /** Data URL of the deliverable image. Withheld from the client until paid, except previews. */
  image?: string;
  /** Free, watermarked version of the hero, shown before payment. */
  previewImage?: string;
  isPreview?: boolean;
  error?: string;
}

/**
 * Live progress through the paid generation phase.
 *
 * This only means something because generation runs through a bounded pool rather than firing
 * every shot at once. All-at-once would sit at 0% for the whole run and then jump to 100%, which
 * is not progress -- it's a spinner with extra steps.
 */
export interface CampaignProgress {
  total: number;
  done: number;
  failed: number;
  startedAt: number;
  /** Mean wall-clock seconds per finished image. Null until the first one lands. */
  avgSeconds: number | null;
}

export interface SourcePhoto {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export interface CampaignJob {
  id: string;
  status: CampaignStatus;
  requestedCount: RequestedImageCount;
  sellerNotes: string;
  sources: SourcePhoto[];
  createdAt: number;
  updatedAt: number;
  statusMessage?: string;
  analysis?: AnalysisResult;
  results?: GeneratedShotResult[];
  /** Present only while (and after) the paid phase runs. Working state -- not persisted. */
  progress?: CampaignProgress;
  listingTitle?: string;
  listingDescription?: string;
  minimumAdditionalEvidenceNeeded?: string[];
  error?: string;
  /** Payment gate. Only the watermarked preview is released while this is false. */
  paid: boolean;
  priceCents: number;
  /** Set once the campaign is attributed to a signed-in account. */
  userId?: string | null;
  /**
   * Where to send the finished set. Taken from the Stripe checkout session rather than from an
   * account, because most buyers will never create one and Stripe collects an address from every
   * payer regardless.
   */
  buyerEmail?: string | null;
}

export const CUSTOMER_STATUS_LABELS: Record<CampaignStatus, string> = {
  queued: 'Preparing your campaign',
  analyzing: 'Understanding the product and diagnosing photo improvements',
  needs_more_evidence: 'One detail is needed',
  generating_preview: 'Creating your free preview image',
  preview_ready: 'Your preview is ready',
  generating: 'Creating the remaining images',
  packaging: 'Preparing your download',
  completed: 'Your listing package is ready',
  incomplete: 'Your listing package is ready, with some images unavailable',
  failed: 'We could not complete the campaign',
};
