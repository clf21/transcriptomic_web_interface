import { Sample, GeneExpression, Contrast } from '../types';

export const mockSamples: Sample[] = [
  {
    id: 'CTRL_1',
    name: 'Control_Rep1',
    condition: 'Control',
    replicate: 1,
    batch: 'Batch_A',
    librarySize: 45000000,
    mappingRate: 92.5,
    rnaIntegrity: 8.2,
    sequencingDepth: 50000000
  },
  {
    id: 'CTRL_2',
    name: 'Control_Rep2',
    condition: 'Control',
    replicate: 2,
    batch: 'Batch_A',
    librarySize: 42000000,
    mappingRate: 91.8,
    rnaIntegrity: 8.0,
    sequencingDepth: 48000000
  },
  {
    id: 'CTRL_3',
    name: 'Control_Rep3',
    condition: 'Control',
    replicate: 3,
    batch: 'Batch_B',
    librarySize: 47000000,
    mappingRate: 93.2,
    rnaIntegrity: 8.4,
    sequencingDepth: 52000000
  },
  {
    id: 'TREAT_1',
    name: 'Treatment_Rep1',
    condition: 'Treatment',
    replicate: 1,
    batch: 'Batch_A',
    librarySize: 44000000,
    mappingRate: 90.5,
    rnaIntegrity: 7.8,
    sequencingDepth: 49000000
  },
  {
    id: 'TREAT_2',
    name: 'Treatment_Rep2',
    condition: 'Treatment',
    replicate: 2,
    batch: 'Batch_B',
    librarySize: 46000000,
    mappingRate: 92.0,
    rnaIntegrity: 8.1,
    sequencingDepth: 51000000
  },
  {
    id: 'TREAT_3',
    name: 'Treatment_Rep3',
    condition: 'Treatment',
    replicate: 3,
    batch: 'Batch_B',
    librarySize: 43000000,
    mappingRate: 91.2,
    rnaIntegrity: 7.9,
    sequencingDepth: 47000000
  }
];

export const mockContrasts: Contrast[] = [
  {
    id: 'treat_vs_ctrl',
    name: 'Treatment vs Control',
    condition1: 'Treatment',
    condition2: 'Control',
    description: 'Compare treatment group against control group'
  },
  {
    id: 'batch_a_vs_b',
    name: 'Batch A vs Batch B',
    condition1: 'Batch_A',
    condition2: 'Batch_B',
    description: 'Compare samples from different batches'
  },
  {
    id: 'high_vs_low_rin',
    name: 'High RIN vs Low RIN',
    condition1: 'High RIN (≥8.0)',
    condition2: 'Low RIN (<8.0)',
    description: 'Compare samples with different RNA integrity scores'
  }
];

export const mockGeneExpression: GeneExpression[] = [
  {
    geneId: 'ENSG00000000001',
    geneName: 'ACTB',
    samples: {
      'CTRL_1': 1250.5,
      'CTRL_2': 1180.2,
      'CTRL_3': 1320.8,
      'TREAT_1': 2100.3,
      'TREAT_2': 2050.7,
      'TREAT_3': 2200.1
    },
    log2FoldChange: 0.75,
    pValue: 0.001,
    adjustedPValue: 0.01
  },
  {
    geneId: 'ENSG00000000002',
    geneName: 'GAPDH',
    samples: {
      'CTRL_1': 3200.1,
      'CTRL_2': 3150.4,
      'CTRL_3': 3280.7,
      'TREAT_1': 3100.2,
      'TREAT_2': 3050.8,
      'TREAT_3': 3180.5
    },
    log2FoldChange: -0.05,
    pValue: 0.65,
    adjustedPValue: 0.75
  },
  {
    geneId: 'ENSG00000000003',
    geneName: 'TP53',
    samples: {
      'CTRL_1': 850.3,
      'CTRL_2': 920.1,
      'CTRL_3': 880.5,
      'TREAT_1': 1450.7,
      'TREAT_2': 1520.2,
      'TREAT_3': 1480.9
    },
    log2FoldChange: 0.68,
    pValue: 0.002,
    adjustedPValue: 0.015
  },
  {
    geneId: 'ENSG00000000004',
    geneName: 'MYC',
    samples: {
      'CTRL_1': 2100.8,
      'CTRL_2': 2050.3,
      'CTRL_3': 2180.1,
      'TREAT_1': 1200.5,
      'TREAT_2': 1150.9,
      'TREAT_3': 1280.3
    },
    log2FoldChange: -0.72,
    pValue: 0.001,
    adjustedPValue: 0.008
  }
];

// Generate additional mock data for visualization
export const generatePCAData = () => {
  return mockSamples.map((sample, index) => ({
    x: Math.random() * 20 - 10 + (sample.condition === 'Control' ? -2 : 2),
    y: Math.random() * 15 - 7.5 + (sample.batch === 'Batch_A' ? -1 : 1),
    label: sample.name,
    color: sample.condition === 'Control' ? '#2563EB' : '#F97316',
    metadata: sample
  }));
};

export const generateVolcanoData = (contrastId: string = 'treat_vs_ctrl') => {
  // Simulate different data based on contrast selection
  const baseData = mockGeneExpression.map(gene => ({
    x: gene.log2FoldChange || 0,
    y: -Math.log10(gene.pValue || 1),
    label: gene.geneName,
    color: Math.abs(gene.log2FoldChange || 0) > 0.5 && (gene.adjustedPValue || 1) < 0.05 ? 
           (gene.log2FoldChange! > 0 ? '#F97316' : '#2563EB') : '#6B7280',
    metadata: gene
  }));

  // Modify data based on contrast type
  if (contrastId === 'batch_a_vs_b') {
    return baseData.map(point => ({
      ...point,
      x: point.x * 0.3 + (Math.random() - 0.5) * 0.2, // Smaller effect sizes for batch effects
      y: point.y * 0.7 + Math.random() * 0.5,
      color: Math.abs(point.x) > 0.2 && point.y > 1.3 ? 
             (point.x > 0 ? '#F97316' : '#2563EB') : '#6B7280'
    }));
  } else if (contrastId === 'high_vs_low_rin') {
    return baseData.map(point => ({
      ...point,
      x: point.x * 0.4 + (Math.random() - 0.5) * 0.3,
      y: point.y * 0.8 + Math.random() * 0.3,
      color: Math.abs(point.x) > 0.3 && point.y > 1.0 ? 
             (point.x > 0 ? '#F97316' : '#2563EB') : '#6B7280'
    }));
  }

  return baseData;
};

export const generateMAData = (contrastId: string = 'treat_vs_ctrl') => {
  // Generate MA plot data based on contrast
  return Array.from({ length: 50 }, (_, i) => {
    const baseMean = Math.random() * 16 - 8;
    let foldChange = Math.random() * 4 - 2;
    
    // Adjust fold changes based on contrast type
    if (contrastId === 'batch_a_vs_b') {
      foldChange *= 0.3; // Smaller batch effects
    } else if (contrastId === 'high_vs_low_rin') {
      foldChange *= 0.4; // Moderate RIN effects
    }
    
    return {
      x: baseMean,
      y: foldChange,
      label: `Gene_${i + 1}`,
      color: Math.abs(foldChange) > 1.0 ? (foldChange > 0 ? '#F97316' : '#2563EB') : '#6B7280'
    };
  });
};