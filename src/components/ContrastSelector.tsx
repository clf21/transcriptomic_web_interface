import React, { useState } from 'react';
import { TraitInfo } from '../types';
import { GitCompare, Info, Plus, X } from 'lucide-react';

interface ContrastSelectorProps {
  availableTraits: TraitInfo[];
  onContrastChange: (trait: string, group1: string, group2: string) => void;
  disabled?: boolean;
}

export const ContrastSelector: React.FC<ContrastSelectorProps> = ({
  availableTraits,
  onContrastChange,
  disabled = false
}) => {
  const [selectedTrait, setSelectedTrait] = useState<string>('');
  const [selectedGroup1, setSelectedGroup1] = useState<string>('');
  const [selectedGroup2, setSelectedGroup2] = useState<string>('');
  const [showCustomContrast, setShowCustomContrast] = useState(false);

  const selectedTraitInfo = availableTraits.find(t => t.name === selectedTrait);

  const handleTraitChange = (traitName: string) => {
    setSelectedTrait(traitName);
    setSelectedGroup1('');
    setSelectedGroup2('');
  };

  const handleCreateContrast = () => {
    if (selectedTrait && selectedGroup1 && selectedGroup2 && selectedGroup1 !== selectedGroup2) {
      onContrastChange(selectedTrait, selectedGroup1, selectedGroup2);
    }
  };

  const getQuickContrasts = () => {
    const quickContrasts = [];
    
    // Look for common trait patterns
    const conditionTrait = availableTraits.find(t => 
      t.name.toLowerCase().includes('condition') || 
      t.name.toLowerCase().includes('treatment') ||
      t.name.toLowerCase().includes('group')
    );
    
    if (conditionTrait && conditionTrait.values.length === 2) {
      quickContrasts.push({
        name: `${conditionTrait.values[1]} vs ${conditionTrait.values[0]}`,
        trait: conditionTrait.name,
        group1: conditionTrait.values[1],
        group2: conditionTrait.values[0]
      });
    }

    const batchTrait = availableTraits.find(t => 
      t.name.toLowerCase().includes('batch')
    );
    
    if (batchTrait && batchTrait.values.length >= 2) {
      quickContrasts.push({
        name: `${batchTrait.values[1]} vs ${batchTrait.values[0]}`,
        trait: batchTrait.name,
        group1: batchTrait.values[1],
        group2: batchTrait.values[0]
      });
    }

    return quickContrasts;
  };

  const quickContrasts = getQuickContrasts();

  if (availableTraits.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="text-gray-400" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Contrast Selection</h3>
        </div>
        <div className="text-gray-500 text-center py-4">
          Upload sample data to enable differential expression analysis
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">Contrast Selection</h3>
      </div>
      
      <div className="space-y-4">
        {/* Quick Contrasts */}
        {quickContrasts.length > 0 && !showCustomContrast && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Contrasts:
            </label>
            <div className="space-y-2">
              {quickContrasts.map((contrast, index) => (
                <button
                  key={index}
                  onClick={() => onContrastChange(contrast.trait, contrast.group1, contrast.group2)}
                  disabled={disabled}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <div className="font-medium text-gray-900">{contrast.name}</div>
                  <div className="text-sm text-gray-600">Based on {contrast.trait}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowCustomContrast(true)}
              className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <Plus size={16} />
              Create custom contrast
            </button>
          </div>
        )}

        {/* Custom Contrast Builder */}
        {(showCustomContrast || quickContrasts.length === 0) && (
          <div className="space-y-4">
            {showCustomContrast && (
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Custom Contrast:
                </label>
                <button
                  onClick={() => setShowCustomContrast(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Trait Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select trait to compare:
              </label>
              <select
                value={selectedTrait}
                onChange={(e) => handleTraitChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Choose a trait...</option>
                {availableTraits
                  .filter(trait => trait.type === 'categorical' && trait.uniqueCount >= 2)
                  .map((trait) => (
                    <option key={trait.name} value={trait.name}>
                      {trait.name} ({trait.uniqueCount} groups)
                    </option>
                  ))}
              </select>
            </div>

            {/* Group Selection */}
            {selectedTraitInfo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group 1:
                  </label>
                  <select
                    value={selectedGroup1}
                    onChange={(e) => setSelectedGroup1(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select group...</option>
                    {selectedTraitInfo.values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group 2:
                  </label>
                  <select
                    value={selectedGroup2}
                    onChange={(e) => setSelectedGroup2(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select group...</option>
                    {selectedTraitInfo.values
                      .filter(value => value !== selectedGroup1)
                      .map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Create Contrast Button */}
            {selectedTrait && selectedGroup1 && selectedGroup2 && (
              <div className="space-y-3">
                <button
                  onClick={handleCreateContrast}
                  disabled={disabled}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create Contrast: {selectedGroup1} vs {selectedGroup2}
                </button>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 mb-1">
                        {selectedGroup1} vs {selectedGroup2}
                      </div>
                      <div className="text-blue-700">
                        Comparing samples with {selectedTrait} = "{selectedGroup1}" against {selectedTrait} = "{selectedGroup2}"
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Upregulated</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Downregulated</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Not significant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};