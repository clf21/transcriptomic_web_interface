import React, { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { SampleInfoTable } from './SampleInfoTable';
import { ScatterPlot } from './ScatterPlot';
import { PlotSelector, PlotType } from './PlotSelector';
import { ContrastSelector } from './ContrastSelector';
import { DataUpload } from './DataUpload';
import { AnalysisResults } from './AnalysisResults';
import { mockSamples, mockContrasts, generatePCAData, generateVolcanoData, generateMAData } from '../data/mockData';
import { Sample, PlotPoint, GeneExpression, UploadedData } from '../types';
import { Activity, Database, BarChart3, Upload } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedPlotType, setSelectedPlotType] = useState<PlotType>('pca');
  const [selectedContrast, setSelectedContrast] = useState<string>('treat_vs_ctrl');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedData, setUploadedData] = useState<UploadedData>({
    samples: [],
    geneExpression: [],
    availableTraits: [],
    isUploaded: false
  });
  const [realAnalysisData, setRealAnalysisData] = useState<{
    pcaData: PlotPoint[];
    volcanoData: PlotPoint[];
    maData: PlotPoint[];
    varianceExplained: number[];
  }>({
    pcaData: [],
    volcanoData: [],
    maData: [],
    varianceExplained: []
  });
  const [currentContrast, setCurrentContrast] = useState<{
    trait: string;
    group1: string;
    group2: string;
  } | null>(null);

  // Use uploaded data if available, otherwise use mock data
  const currentSamples = uploadedData.isUploaded ? uploadedData.samples : mockSamples;
  const currentGeneExpression = uploadedData.isUploaded ? uploadedData.geneExpression : [];

  const getPlotData = (): PlotPoint[] => {
    // If no uploaded data, use mock data
    if (!uploadedData.isUploaded) {
      switch (selectedPlotType) {
        case 'pca':
          return generatePCAData();
        case 'volcano':
          return generateVolcanoData(selectedContrast);
        case 'ma':
          return generateMAData(selectedContrast);
        default:
          return [];
      }
    }
    
    // Use real analysis data if available for uploaded data
    switch (selectedPlotType) {
      case 'pca':
        return realAnalysisData.pcaData.length > 0 ? realAnalysisData.pcaData : [];
      case 'volcano':
        return realAnalysisData.volcanoData.length > 0 ? realAnalysisData.volcanoData : [];
      case 'ma':
        return realAnalysisData.maData.length > 0 ? realAnalysisData.maData : [];
      default:
        return [];
    }
  };

  const getPlotConfig = () => {
    const pcVarianceText = uploadedData.isUploaded && realAnalysisData.varianceExplained.length > 0
      ? `PC1 (${(realAnalysisData.varianceExplained[0] * 100).toFixed(1)}% variance), PC2 (${(realAnalysisData.varianceExplained[1] * 100).toFixed(1)}% variance)`
      : 'PC1 (45.2% variance), PC2 (23.8% variance)';
    
    const configs = {
      pca: {
        title: 'Principal Component Analysis',
        xLabel: uploadedData.isUploaded && realAnalysisData.varianceExplained.length > 0 
          ? `PC1 (${(realAnalysisData.varianceExplained[0] * 100).toFixed(1)}% variance)`
          : 'PC1 (45.2% variance)',
        yLabel: uploadedData.isUploaded && realAnalysisData.varianceExplained.length > 0
          ? `PC2 (${(realAnalysisData.varianceExplained[1] * 100).toFixed(1)}% variance)`
          : 'PC2 (23.8% variance)',
        showGrid: true,
        showLegend: true,
        width: 600,
        height: 400
      },
      volcano: {
        title: `Volcano Plot - ${mockContrasts.find(c => c.id === selectedContrast)?.name || 'Differential Expression'}`,
        xLabel: 'log₂ Fold Change',
        yLabel: '-log₁₀ P-value',
        showGrid: true,
        showLegend: true,
        width: 600,
        height: 400
      },
      ma: {
        title: `MA Plot - ${mockContrasts.find(c => c.id === selectedContrast)?.name || 'Expression Analysis'}`,
        xLabel: 'log₂ Mean Expression',
        yLabel: 'log₂ Fold Change',
        showGrid: true,
        showLegend: true,
        width: 600,
        height: 400
      }
    };
    return configs[selectedPlotType];
  };

  const handlePointClick = (point: PlotPoint) => {
    console.log('Clicked point:', point);
  };

  const handleDataUpload = (samples: Sample[], geneExpression: GeneExpression[]) => {
    console.log('Dashboard: handleDataUpload called with:', { 
      samplesCount: samples.length, 
      genesCount: geneExpression.length 
    });
    
    const newUploadedData = {
      samples,
      geneExpression,
      availableTraits: (window as any).availableTraits || [],
      isUploaded: true
    };
    
    setUploadedData(newUploadedData);
    
    // Store in sessionStorage as backup
    try {
      sessionStorage.setItem('uploadedRNASeqData', JSON.stringify(newUploadedData));
      console.log('Dashboard: Data backed up to sessionStorage');
    } catch (error) {
      console.warn('Dashboard: Failed to backup data to sessionStorage:', error);
    }
    
    console.log('Dashboard: uploadedData state set to uploaded=true');
    setShowUpload(false);
  };

  // Restore data from sessionStorage if available
  React.useEffect(() => {
    if (!uploadedData.isUploaded) {
      try {
        const storedData = sessionStorage.getItem('uploadedRNASeqData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.isUploaded && parsedData.samples.length > 0) {
            console.log('Dashboard: Restoring data from sessionStorage');
            setUploadedData(parsedData);
          }
        }
      } catch (error) {
        console.warn('Dashboard: Failed to restore data from sessionStorage:', error);
      }
    }
  }, []);

  const handleContrastChange = (trait: string, group1: string, group2: string) => {
    setCurrentContrast({ trait, group1, group2 });
  };

  const handlePCADataGenerated = (pcaData: PlotPoint[], varianceExplained: number[]) => {
    console.log('Dashboard: PCA data generated, maintaining uploaded state:', uploadedData.isUploaded);
    setRealAnalysisData(prev => {
      const newData = { ...prev, pcaData, varianceExplained };
      console.log('Dashboard: Setting PCA data, uploaded state should remain:', uploadedData.isUploaded);
      return newData;
    });
  };

  const handleVolcanoDataGenerated = (volcanoData: PlotPoint[]) => {
    console.log('Dashboard: Volcano data generated, maintaining uploaded state:', uploadedData.isUploaded);
    setRealAnalysisData(prev => {
      const newData = { ...prev, volcanoData };
      console.log('Dashboard: Setting volcano data, uploaded state should remain:', uploadedData.isUploaded);
      return newData;
    });
  };

  const handleMADataGenerated = (maData: PlotPoint[]) => {
    console.log('Dashboard: MA data generated, maintaining uploaded state:', uploadedData.isUploaded);
    setRealAnalysisData(prev => {
      const newData = { ...prev, maData };
      console.log('Dashboard: Setting MA data, uploaded state should remain:', uploadedData.isUploaded);
      return newData;
    });
  };

  const isDifferentialPlot = selectedPlotType === 'volcano' || selectedPlotType === 'ma';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={28} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">RNA-seq Analytics</h1>
                <p className="text-sm text-gray-500">Data Visualization Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span>{currentSamples.length} Samples</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} />
                <span>Multiple Plots</span>
              </div>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Upload size={14} />
                Upload Data
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Sample Information Section */}
          <section>
            <SampleInfoTable
              samples={currentSamples}
              availableTraits={uploadedData.availableTraits}
              onSampleSelect={setSelectedSample}
            />
          </section>

          {/* Visualization Section */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 space-y-6">
              <PlotSelector
                selectedPlot={selectedPlotType}
                onPlotChange={setSelectedPlotType}
              />
              
              {/* Contrast Selector - only show for differential expression plots */}
              {isDifferentialPlot && (
                <ContrastSelector
                  availableTraits={uploadedData.availableTraits}
                  onContrastChange={handleContrastChange}
                />
              )}
              
              {/* Sample Details */}
              {selectedSample && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedSample.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Condition:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedSample.condition === 'Control' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedSample.condition}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RIN Score:</span>
                      <span className={`font-medium ${
                        selectedSample.rnaIntegrity >= 8 ? 'text-green-600' : 
                        selectedSample.rnaIntegrity >= 7 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {selectedSample.rnaIntegrity.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mapping Rate:</span>
                      <span className="font-medium">{selectedSample.mappingRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="xl:col-span-2">
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('Plot rendering error:', error, errorInfo);
                  console.log('Dashboard: Plot error occurred, uploaded state:', uploadedData.isUploaded);
                }}
              >
                <ScatterPlot
                  data={getPlotData()}
                  config={getPlotConfig()}
                  onPointClick={handlePointClick}
                />
              </ErrorBoundary>
            </div>
          </section>

          {/* Analysis Results - only show for uploaded data */}
          {uploadedData.isUploaded && (
            <section>
              <AnalysisResults
                samples={currentSamples}
                geneExpression={currentGeneExpression}
                currentContrast={currentContrast}
                onPCADataGenerated={handlePCADataGenerated}
                onVolcanoDataGenerated={handleVolcanoDataGenerated}
                onMADataGenerated={handleMADataGenerated}
              />
            </section>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <DataUpload
          onDataUpload={handleDataUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};