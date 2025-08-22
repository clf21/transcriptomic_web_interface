import React, { useState, useEffect } from 'react';
import { RNASeqAnalyzer, calculateQCMetrics } from '../utils/statisticalAnalysis';
import { Sample, GeneExpression, PlotPoint } from '../types';
import { Contrast } from '../types';
import { BarChart, TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface AnalysisResultsProps {
  samples: Sample[];
  geneExpression: GeneExpression[];
  currentContrast: {
    trait: string;
    group1: string;
    group2: string;
  } | null;
  onPCADataGenerated: (data: PlotPoint[], varianceExplained: number[]) => void;
  onVolcanoDataGenerated: (data: PlotPoint[]) => void;
  onMADataGenerated: (data: PlotPoint[]) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  samples,
  geneExpression,
  currentContrast,
  onPCADataGenerated,
  onVolcanoDataGenerated,
  onMADataGenerated,
}) => {
  const [analyzer, setAnalyzer] = useState<RNASeqAnalyzer | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [qcMetrics, setQcMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [contrastError, setContrastError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [isGeneratingPlots, setIsGeneratingPlots] = useState(false);

  useEffect(() => {
    console.log('AnalysisResults: useEffect triggered with:', {
      samplesCount: samples.length,
      genesCount: geneExpression.length,
      hasData: samples.length > 0 && geneExpression.length > 0
    });
    
    if (samples.length > 0 && geneExpression.length > 0) {
      performAnalysis();
    }
    // Clear analysis state if no data
    else {
      setAnalysisComplete(false);
      setAnalyzer(null);
      setQcMetrics(null);
    }
  }, [samples, geneExpression]);

  useEffect(() => {
    console.log('AnalysisResults: contrast effect triggered with:', {
      hasAnalyzer: !!analyzer,
      analysisComplete,
      hasContrast: !!currentContrast,
      contrastDetails: currentContrast
    });
    
    if (analyzer && analysisComplete) {
      generateContrastSpecificPlots();
    }
    // Clear plots if no analyzer or analysis not complete
    else if (!analyzer || !analysisComplete) {
      onVolcanoDataGenerated([]);
      onMADataGenerated([]);
    }
  }, [currentContrast, analyzer, analysisComplete]);

  const performAnalysis = async () => {
    console.log('AnalysisResults: Starting performAnalysis');
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Initialize analyzer
      console.log('AnalysisResults: Creating new analyzer');
      const newAnalyzer = new RNASeqAnalyzer(samples, geneExpression);
      setAnalyzer(newAnalyzer);
      
      // Calculate QC metrics
      console.log('AnalysisResults: Calculating QC metrics');
      const metrics = calculateQCMetrics(samples, geneExpression);
      setQcMetrics(metrics);
      
      // Perform PCA
      console.log('AnalysisResults: Performing PCA');
      const pcaResults = newAnalyzer.performPCA();
      onPCADataGenerated(pcaResults.pcaData, pcaResults.varianceExplained);
      
      console.log('AnalysisResults: Analysis complete, setting analysisComplete=true');
      setAnalysisComplete(true);
    } catch (err) {
      console.error('AnalysisResults: Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      console.log('AnalysisResults: performAnalysis finished');
    }
  };

  const generateContrastSpecificPlots = async () => {
    console.log('AnalysisResults: Starting generateContrastSpecificPlots');
    
    if (!analyzer || !currentContrast) {
      console.log('AnalysisResults: No analyzer or contrast, clearing plots');
      // Clear plots if no contrast selected
      onVolcanoDataGenerated([]);
      onMADataGenerated([]);
      return;
    }
    
    console.log('AnalysisResults: Generating plots for contrast:', currentContrast);
    setIsGeneratingPlots(true);
    setAnalysisProgress('Preparing differential expression analysis...');
    setContrastError(null);
    
    try {
      // Create grouping function based on selected trait
      const groupingFunction = (sample: Sample) => {
        const traitValue = (sample as any)[currentContrast.trait];
        return traitValue ? String(traitValue) : 'unknown';
      };
      
      // Validate that both groups have samples
      const group1Samples = samples.filter(s => groupingFunction(s) === currentContrast.group1);
      const group2Samples = samples.filter(s => groupingFunction(s) === currentContrast.group2);
      
      console.log('AnalysisResults: Group validation:', {
        group1Count: group1Samples.length,
        group2Count: group2Samples.length
      });
      
      if (group1Samples.length === 0 || group2Samples.length === 0) {
        setContrastError(`Cannot create contrast "${currentContrast.group1} vs ${currentContrast.group2}": one or both groups have no samples (Group 1: ${group1Samples.length}, Group 2: ${group2Samples.length})`);
        onVolcanoDataGenerated([]);
        onMADataGenerated([]);
        return;
      }
      
      try {
        setAnalysisProgress('Computing differential expression...');
        console.log('AnalysisResults: Starting volcano plot generation');
        
        const volcanoData = await analyzer.generateVolcanoPlotAsync(
          groupingFunction,
          currentContrast.group1,
          currentContrast.group2
        );
        
        console.log('AnalysisResults: Volcano data generated, count:', volcanoData.length);
        setAnalysisProgress('Generating MA plot data...');
        
        const maData = await analyzer.generateMAPlotAsync(
          groupingFunction,
          currentContrast.group1,
          currentContrast.group2
        );
        
        console.log('AnalysisResults: MA data generated, count:', maData.length);
        console.log('AnalysisResults: Calling plot data handlers');
        
        onVolcanoDataGenerated(volcanoData);
        onMADataGenerated(maData);
        
        console.log('AnalysisResults: Plot generation complete');
      } catch (analysisError) {
        console.error('AnalysisResults: Analysis error:', analysisError);
        setContrastError(`Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
        onVolcanoDataGenerated([]);
        onMADataGenerated([]);
      }
    } catch (err) {
      console.error('AnalysisResults: Contrast generation error:', err);
      setContrastError(`Failed to generate contrast plots: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPlots(false);
      setAnalysisProgress('');
      console.log('AnalysisResults: generateContrastSpecificPlots finished');
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span className="font-medium">Analysis Error</span>
        </div>
        <p className="text-red-700 mt-1">{error}</p>
        <button
          onClick={performAnalysis}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrast Error Display */}
      {contrastError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle size={20} />
            <span className="font-medium">Contrast Analysis Issue</span>
          </div>
          <p className="text-yellow-700 mt-1">{contrastError}</p>
          <p className="text-yellow-600 text-sm mt-2">
            Please ensure your sample data has sufficient variation in the relevant metadata fields to form comparison groups.
          </p>
        </div>
      )}

      {/* Analysis Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Status</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isAnalyzing || isGeneratingPlots ? 'bg-yellow-500 animate-pulse' : 
              analysisComplete ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-medium">
              {isAnalyzing ? 'Analyzing...' : 
               isGeneratingPlots ? 'Generating plots...' : 
               analysisComplete ? 'Complete' : 'Pending'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">{samples.length}</span> samples
          </div>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">{geneExpression.length}</span> genes
          </div>
        </div>
        
        {/* Progress indicator */}
        {(isAnalyzing || isGeneratingPlots) && analysisProgress && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">{analysisProgress}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quality Control Metrics */}
      {qcMetrics && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Quality Control</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {qcMetrics.totalGenes.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Genes</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {qcMetrics.expressedGenes.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Expressed Genes</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {(qcMetrics.expressionRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-purple-700">Expression Rate</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {qcMetrics.sampleMetrics.length}
              </div>
              <div className="text-sm text-orange-700">Samples Analyzed</div>
            </div>
          </div>
          
          {/* Sample-specific metrics */}
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Sample Metrics</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Sample</th>
                    <th className="text-right py-2">Total Counts</th>
                    <th className="text-right py-2">Detected Genes</th>
                    <th className="text-right py-2">Detection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {qcMetrics.sampleMetrics.map((metric: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{metric.sampleName}</td>
                      <td className="py-2 text-right">{metric.totalCounts.toLocaleString()}</td>
                      <td className="py-2 text-right">{metric.detectedGenes.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <span className={`${
                          metric.detectionRate > 0.5 ? 'text-green-600' : 
                          metric.detectionRate > 0.3 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(metric.detectionRate * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Methods */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="text-purple-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Methods</h3>
        </div>
        
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-900">Normalization:</span> DESeq2-style median-of-ratios normalization with size factor calculation
            {geneExpression.length > 1000 && (
              <span className="text-blue-600 ml-2">(Optimized for {geneExpression.length.toLocaleString()} genes)</span>
            )}
          </div>
          <div>
            <span className="font-medium text-gray-900">Transformation:</span> Variance stabilizing transformation for PCA analysis
          </div>
          <div>
            <span className="font-medium text-gray-900">PCA:</span> Principal component analysis using top {Math.min(1000, geneExpression.length)} most variable genes
          </div>
          <div>
            <span className="font-medium text-gray-900">Differential Expression:</span> Statistical testing with fold change calculation and multiple testing correction
            {geneExpression.length > 500 && (
              <span className="text-green-600 ml-2">(Batch processing enabled)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};