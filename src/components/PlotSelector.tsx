import React from 'react';
import { BarChart3, ScatterChart as Scatter, TrendingUp } from 'lucide-react';

export type PlotType = 'pca' | 'volcano' | 'ma';

interface PlotSelectorProps {
  selectedPlot: PlotType;
  onPlotChange: (plotType: PlotType) => void;
}

export const PlotSelector: React.FC<PlotSelectorProps> = ({
  selectedPlot,
  onPlotChange
}) => {
  const plots = [
    {
      type: 'pca' as PlotType,
      label: 'PCA Plot',
      description: 'Principal Component Analysis',
      icon: Scatter
    },
    {
      type: 'volcano' as PlotType,
      label: 'Volcano Plot',
      description: 'Differential Expression',
      icon: TrendingUp
    },
    {
      type: 'ma' as PlotType,
      label: 'MA Plot',
      description: 'Mean vs Average',
      icon: BarChart3
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualization Type</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plots.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onPlotChange(type)}
            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selectedPlot === type
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <Icon size={24} />
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};