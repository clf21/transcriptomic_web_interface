export interface Sample {
  id: string;
  name: string;
  condition: string;
  replicate: number;
  batch: string;
  librarySize: number;
  mappingRate: number;
  rnaIntegrity: number;
  sequencingDepth: number;
}

export interface GeneExpression {
  geneId: string;
  geneName: string;
  samples: Record<string, number>;
  log2FoldChange?: number;
  pValue?: number;
  adjustedPValue?: number;
}

export interface PlotPoint {
  x: number;
  y: number;
  label: string;
  color?: string;
  size?: number;
  metadata?: any;
}

export interface PlotConfig {
  title: string;
  xLabel: string;
  yLabel: string;
  showGrid: boolean;
  showLegend: boolean;
  width: number;
  height: number;
}

export interface Contrast {
  id: string;
  name: string;
  trait: string;
  group1: string;
  group2: string;
  description: string;
}

export interface TraitInfo {
  name: string;
  type: 'categorical' | 'numerical';
  values: string[];
  uniqueCount: number;
}

export interface UploadedData {
  samples: Sample[];
  geneExpression: GeneExpression[];
  availableTraits: TraitInfo[];
  isUploaded: boolean;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  field?: string;
}