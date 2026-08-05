export type RequestedImageCount = 4 | 6 | 8 | 10;

export type ShotClassification = 'marketing' | 'evidence';

export type ShotOrientation = 'square' | 'portrait' | 'landscape';

// independent: generated fresh from the original source photos only, no hero involvement.
// hero_edit: the hero image itself is edited directly (same camera framing as the hero) --
//   this is what guarantees a pixel-identical background, since the edit only touches what
//   the prompt describes and leaves the rest of the hero image untouched.
// hero_reference: the shot needs a genuinely different camera angle/position than the hero,
//   so a pixel-identical background isn't physically coherent -- the hero is attached as one
//   of several reference images purely for material/lighting/palette consistency.
export type ProductionMode = 'independent' | 'hero_edit' | 'hero_reference';

export interface ShotPlan {
  sequenceNumber: number;
  imageRole: string;
  imageJob: string;
  classification: ShotClassification;
  productionMode: ProductionMode;
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
  environmentDescription: string;
  shots: ShotPlan[];
  listingTitle: string;
  listingDescription: string;
}

export type CampaignStatus =
  | 'queued'
  | 'analyzing'
  | 'needs_more_evidence'
  | 'generating_hero'
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
  image?: string;
  error?: string;
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
  listingTitle?: string;
  listingDescription?: string;
  minimumAdditionalEvidenceNeeded?: string[];
  error?: string;
}

export const CUSTOMER_STATUS_LABELS: Record<CampaignStatus, string> = {
  queued: 'Preparing your campaign',
  analyzing: 'Understanding the product and diagnosing photo improvements',
  needs_more_evidence: 'One detail is needed',
  generating_hero: 'Creating the main listing image',
  generating: 'Creating the remaining images',
  packaging: 'Preparing your download',
  completed: 'Your listing package is ready',
  incomplete: 'Your listing package is ready, with some images unavailable',
  failed: 'We could not complete the campaign',
};
