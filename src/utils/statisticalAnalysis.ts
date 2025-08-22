import { Matrix } from 'ml-matrix';
import { PCA } from 'ml-pca';
import { GeneExpression, Sample, PlotPoint } from '../types';
import { evaluate } from 'mathjs';

// Statistical functions for RNA-seq analysis
export class RNASeqAnalyzer {
  private samples: Sample[];
  private geneExpression: GeneExpression[];
  private countMatrix: number[][];
  private geneNames: string[];
  private sampleNames: string[];
  private normalizedCountsCache: number[][] | null = null;
  private vstDataCache: number[][] | null = null;

  constructor(samples: Sample[], geneExpression: GeneExpression[]) {
    console.log('RNASeqAnalyzer: Constructor called with:', {
      samplesCount: samples.length,
      genesCount: geneExpression.length
    });
    this.samples = samples;
    this.geneExpression = geneExpression;
    this.sampleNames = samples.map(s => s.name);
    this.geneNames = geneExpression.map(g => g.geneName);
    this.countMatrix = this.buildCountMatrix();
  }

  // Clear caches when data changes
  public clearCaches(): void {
    this.normalizedCountsCache = null;
    this.vstDataCache = null;
  }

  private buildCountMatrix(): number[][] {
    return this.geneExpression.map(gene => 
      this.sampleNames.map(sampleName => gene.samples[sampleName] || 0)
    );
  }

  // DESeq2-style normalization
  public normalizeCountsDESeq2(): number[][] {
    if (this.normalizedCountsCache) {
      return this.normalizedCountsCache;
    }

    const geometricMeans = this.calculateGeometricMeans();
    const sizeFactors = this.calculateSizeFactors(geometricMeans);
    
    const normalizedCounts = this.countMatrix.map(geneRow => 
      geneRow.map((count, sampleIndex) => count / sizeFactors[sampleIndex])
    );

    this.normalizedCountsCache = normalizedCounts;
    return normalizedCounts;
  }

  private calculateGeometricMeans(): number[] {
    return this.countMatrix.map(geneRow => {
      const nonZeroCounts = geneRow.filter(count => count > 0);
      if (nonZeroCounts.length === 0) return 0;
      
      const logSum = nonZeroCounts.reduce((sum, count) => sum + Math.log(count), 0);
      return Math.exp(logSum / nonZeroCounts.length);
    });
  }

  private calculateSizeFactors(geometricMeans: number[]): number[] {
    const ratios = this.samples.map((_, sampleIndex) => {
      const validRatios = this.countMatrix
        .map((geneRow, geneIndex) => {
          const count = geneRow[sampleIndex];
          const geomMean = geometricMeans[geneIndex];
          return geomMean > 0 && count > 0 ? count / geomMean : null;
        })
        .filter(ratio => ratio !== null) as number[];
      
      return this.median(validRatios);
    });
    
    return ratios;
  }

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  // Variance stabilizing transformation (similar to DESeq2's vst)
  public varianceStabilizingTransform(): number[][] {
    if (this.vstDataCache) {
      return this.vstDataCache;
    }

    const normalizedCounts = this.normalizeCountsDESeq2();
    
    const vstData = normalizedCounts.map(geneRow => 
      geneRow.map(count => {
        // Simplified VST approximation
        if (count < 0.5) return 0;
        return Math.log2(count + 0.5);
      })
    );

    this.vstDataCache = vstData;
    return vstData;
  }

  // PCA analysis using variance-stabilized data
  public performPCA(): { 
    pcaData: PlotPoint[], 
    varianceExplained: number[],
    loadings: number[][] 
  } {
    console.log('Starting PCA analysis...');
    const startTime = performance.now();

    const vstData = this.varianceStabilizingTransform();
    
    // Optimize gene filtering - use top 1000 for better results but limit computation
    const maxGenes = Math.min(1000, vstData.length);
    console.log(`Calculating variance for ${vstData.length} genes...`);
    
    const geneVariances = vstData.map((geneRow, index) => ({
      index,
      variance: this.calculateVariance(geneRow),
      geneName: this.geneNames[index]
    })).filter(gene => gene.variance > 0); // Remove zero-variance genes
    
    const topVariableGenes = geneVariances
      .sort((a, b) => b.variance - a.variance)
      .slice(0, maxGenes);
    
    console.log(`Using top ${topVariableGenes.length} variable genes for PCA`);
    
    const filteredData = topVariableGenes.map(gene => vstData[gene.index]);
    
    // Transpose matrix (samples as rows, genes as columns)
    const transposedData = this.transposeMatrix(filteredData);
    
    // Perform PCA
    console.log('Computing PCA...');
    
    const matrix = new Matrix(transposedData);
    const pca = new PCA(matrix, { center: true, scale: false });
    
    const pcaResult = pca.predict(matrix);
    const varianceExplained = pca.getExplainedVariance();
    
    // Create plot points
    const pcaData: PlotPoint[] = this.samples.map((sample, index) => ({
      x: pcaResult.get(index, 0),
      y: pcaResult.get(index, 1),
      label: sample.name,
      color: this.getConditionColor(sample.condition),
      size: 6,
      metadata: sample
    }));

    const endTime = performance.now();
    console.log(`PCA analysis completed in ${(endTime - startTime).toFixed(2)}ms`);

    return {
      pcaData,
      varianceExplained: varianceExplained.slice(0, 10), // First 10 PCs
      loadings: pca.getLoadings().to2DArray()
    };
  }

  private transposeMatrix(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Differential expression analysis (simplified DESeq2-like approach)
  public async performDifferentialExpression(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): Promise<GeneExpression[]> {
    console.log('Starting differential expression analysis...');
    const startTime = performance.now();

    const group1Samples = this.samples.filter(s => groupingFunction(s) === group1Value);
    const group2Samples = this.samples.filter(s => groupingFunction(s) === group2Value);
    
    if (group1Samples.length === 0 || group2Samples.length === 0) {
      throw new Error('Both conditions must have at least one sample');
    }

    console.log(`Comparing ${group1Samples.length} vs ${group2Samples.length} samples`);

    const normalizedCounts = this.normalizeCountsDESeq2();
    
    // Process genes in batches to prevent UI blocking
    const batchSize = 100;
    const results: GeneExpression[] = [];
    
    for (let i = 0; i < this.geneExpression.length; i += batchSize) {
      const batch = this.geneExpression.slice(i, i + batchSize);
      
      const batchResults = batch.map((gene, batchIndex) => {
        const geneIndex = i + batchIndex;
        
        const group1Counts = group1Samples.map(s => normalizedCounts[geneIndex][this.sampleNames.indexOf(s.name)]);
        const group2Counts = group2Samples.map(s => normalizedCounts[geneIndex][this.sampleNames.indexOf(s.name)]);
        
        const mean1 = group1Counts.reduce((sum, val) => sum + val, 0) / group1Counts.length;
        const mean2 = group2Counts.reduce((sum, val) => sum + val, 0) / group2Counts.length;
        
        // Avoid log of zero
        const adjustedMean1 = Math.max(mean1, 0.1);
        const adjustedMean2 = Math.max(mean2, 0.1);
        
        const log2FoldChange = Math.log2(adjustedMean2 / adjustedMean1);
        
        // Simplified statistical test (Welch's t-test approximation)
        const pValue = this.calculatePValue(group1Counts, group2Counts);
        
        return {
          ...gene,
          log2FoldChange,
          pValue,
          adjustedPValue: this.adjustPValue(pValue) // Simplified Benjamini-Hochberg
        };
      });
      
      results.push(...batchResults);
      
      // Allow UI to update between batches
      if (i % (batchSize * 5) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const endTime = performance.now();
    console.log(`Differential expression analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return results;
  }

  // Async version for better performance
  public async performDifferentialExpressionAsync(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): Promise<GeneExpression[]> {
    console.log('Starting async differential expression analysis...');
    const startTime = performance.now();

    const group1Samples = this.samples.filter(s => groupingFunction(s) === group1Value);
    const group2Samples = this.samples.filter(s => groupingFunction(s) === group2Value);
    
    if (group1Samples.length === 0 || group2Samples.length === 0) {
      throw new Error('Both conditions must have at least one sample');
    }

    console.log(`Comparing ${group1Samples.length} vs ${group2Samples.length} samples`);

    const normalizedCounts = this.normalizeCountsDESeq2();
    
    // Process genes in smaller batches with async breaks
    const batchSize = 50;
    const results: GeneExpression[] = [];
    
    for (let i = 0; i < this.geneExpression.length; i += batchSize) {
      const batch = this.geneExpression.slice(i, i + batchSize);
      
      const batchResults = batch.map((gene, batchIndex) => {
        const geneIndex = i + batchIndex;
        
        const group1Counts = group1Samples.map(s => normalizedCounts[geneIndex][this.sampleNames.indexOf(s.name)]);
        const group2Counts = group2Samples.map(s => normalizedCounts[geneIndex][this.sampleNames.indexOf(s.name)]);
        
        const mean1 = group1Counts.reduce((sum, val) => sum + val, 0) / group1Counts.length;
        const mean2 = group2Counts.reduce((sum, val) => sum + val, 0) / group2Counts.length;
        
        // Avoid log of zero
        const adjustedMean1 = Math.max(mean1, 0.1);
        const adjustedMean2 = Math.max(mean2, 0.1);
        
        const log2FoldChange = Math.log2(adjustedMean2 / adjustedMean1);
        
        // Simplified statistical test (Welch's t-test approximation)
        const pValue = this.calculatePValue(group1Counts, group2Counts);
        
        return {
          ...gene,
          log2FoldChange,
          pValue,
          adjustedPValue: this.adjustPValue(pValue) // Simplified Benjamini-Hochberg
        };
      });
      
      results.push(...batchResults);
      
      // Progress reporting
      if (i % (batchSize * 10) === 0) {
        const progress = ((i / this.geneExpression.length) * 100).toFixed(1);
        console.log(`DE analysis progress: ${progress}%`);
      }
      
      // Allow UI to breathe
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const endTime = performance.now();
    console.log(`Async differential expression analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return results;
  }

  private calculatePValue(group1: number[], group2: number[]): number {
    // Simplified t-test calculation
    const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length;
    const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length;
    
    const var1 = this.calculateVariance(group1);
    const var2 = this.calculateVariance(group2);
    
    const pooledSE = Math.sqrt(var1 / group1.length + var2 / group2.length);
    
    if (pooledSE === 0) return 1.0;
    
    const tStat = Math.abs(mean1 - mean2) / pooledSE;
    
    // Simplified p-value approximation
    return Math.max(0.001, 2 * (1 - this.normalCDF(tStat)));
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private adjustPValue(pValue: number): number {
    // Simplified Benjamini-Hochberg correction
    // In a real implementation, this would consider all p-values
    return Math.min(1.0, pValue * 1.1);
  }

  private getConditionColor(condition: string): string {
    const colorMap: Record<string, string> = {
      'Control': '#2563EB',
      'Treatment': '#F97316',
      'Treated': '#F97316',
      'Case': '#DC2626',
      'Healthy': '#059669',
      'Disease': '#DC2626'
    };
    return colorMap[condition] || '#6B7280';
  }

  // Generate volcano plot data
  public async generateVolcanoPlotAsync(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): Promise<PlotPoint[]> {
    console.log('RNASeqAnalyzer: generateVolcanoPlotAsync called');
    const deResults = await this.performDifferentialExpressionAsync(groupingFunction, group1Value, group2Value);
    console.log('RNASeqAnalyzer: DE results obtained, generating plot points');
    
    return deResults.map(gene => ({
      x: gene.log2FoldChange || 0,
      y: -Math.log10(Math.max(gene.pValue || 1, 1e-10)),
      label: gene.geneName,
      color: this.getVolcanoColor(gene.log2FoldChange || 0, gene.adjustedPValue || 1),
      size: 4,
      metadata: gene
    }));
  }

  private getVolcanoColor(log2FC: number, adjPValue: number): string {
    const fcThreshold = 1.0;
    const pThreshold = 0.05;
    
    if (Math.abs(log2FC) >= fcThreshold && adjPValue < pThreshold) {
      return log2FC > 0 ? '#F97316' : '#2563EB'; // Orange for up, blue for down
    }
    return '#6B7280'; // Gray for non-significant
  }

  // Generate MA plot data
  public async generateMAPlotAsync(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): Promise<PlotPoint[]> {
    console.log('RNASeqAnalyzer: generateMAPlotAsync called');
    const deResults = await this.performDifferentialExpressionAsync(groupingFunction, group1Value, group2Value);
    const normalizedCounts = this.normalizeCountsDESeq2();
    console.log('RNASeqAnalyzer: MA plot data generation complete');
    
    return deResults.map((gene, geneIndex) => {
      const counts = normalizedCounts[geneIndex];
      const baseMean = Math.log2(counts.reduce((sum, val) => sum + val, 0) / counts.length + 1);
      
      return {
        x: baseMean,
        y: gene.log2FoldChange || 0,
        label: gene.geneName,
        color: this.getVolcanoColor(gene.log2FoldChange || 0, gene.adjustedPValue || 1),
        size: 4,
        metadata: gene
      };
    });
  }

  // Synchronous versions for backward compatibility
  public generateVolcanoPlot(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): PlotPoint[] {
    const deResults = this.performDifferentialExpression(groupingFunction, group1Value, group2Value);
    
    return deResults.map(gene => ({
      x: gene.log2FoldChange || 0,
      y: -Math.log10(Math.max(gene.pValue || 1, 1e-10)),
      label: gene.geneName,
      color: this.getVolcanoColor(gene.log2FoldChange || 0, gene.adjustedPValue || 1),
      size: 4,
      metadata: gene
    }));
  }

  public generateMAPlot(
    groupingFunction: (sample: Sample) => string,
    group1Value: string,
    group2Value: string
  ): PlotPoint[] {
    const deResults = this.performDifferentialExpression(groupingFunction, group1Value, group2Value);
    const normalizedCounts = this.normalizeCountsDESeq2();
    
    return deResults.map((gene, geneIndex) => {
      const counts = normalizedCounts[geneIndex];
      const baseMean = Math.log2(counts.reduce((sum, val) => sum + val, 0) / counts.length + 1);
      
      return {
        x: baseMean,
        y: gene.log2FoldChange || 0,
        label: gene.geneName,
        color: this.getVolcanoColor(gene.log2FoldChange || 0, gene.adjustedPValue || 1),
        size: 4,
        metadata: gene
      };
    });
  }
}

// Quality control metrics
export const calculateQCMetrics = (samples: Sample[], geneExpression: GeneExpression[]) => {
  const totalGenes = geneExpression.length;
  const expressedGenes = geneExpression.filter(gene => 
    Object.values(gene.samples).some(count => count > 0)
  ).length;
  
  const sampleMetrics = samples.map(sample => {
    const totalCounts = geneExpression.reduce((sum, gene) => 
      sum + (gene.samples[sample.name] || 0), 0
    );
    
    const detectedGenes = geneExpression.filter(gene => 
      (gene.samples[sample.name] || 0) > 0
    ).length;
    
    return {
      sampleName: sample.name,
      totalCounts,
      detectedGenes,
      detectionRate: detectedGenes / totalGenes
    };
  });
  
  return {
    totalGenes,
    expressedGenes,
    expressionRate: expressedGenes / totalGenes,
    sampleMetrics
  };
};