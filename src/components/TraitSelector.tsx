import React from 'react';
import { TraitInfo, Sample } from '../types';
import { Palette } from 'lucide-react';

interface TraitSelectorProps {
  availableTraits: TraitInfo[];
  samples: Sample[];
  selectedTrait: string;
  onTraitChange: (traitName: string) => void;
  className?: string;
}

export const TraitSelector: React.FC<TraitSelectorProps> = ({
  availableTraits,
  samples,
  selectedTrait,
  onTraitChange,
  className = ''
}) => {
  // Helper function to detect trait type from sample data
  const detectTraitType = (traitName: string): 'categorical' | 'numerical' => {
    if (samples.length === 0) return 'categorical';
    
    const sampleValues = samples.map(sample => (sample as any)[traitName]).filter(val => val !== undefined && val !== null);
    if (sampleValues.length === 0) return 'categorical';
    
    // Check if all values are numbers
    const allNumbers = sampleValues.every(val => typeof val === 'number' || (!isNaN(Number(val)) && val !== ''));
    return allNumbers ? 'numerical' : 'categorical';
  };

  // Get all trait names that actually exist in the sample data
  const getAvailableTraitNames = (): string[] => {
    if (samples.length === 0) return [];
    
    const allKeys = new Set<string>();
    samples.forEach(sample => {
      Object.keys(sample).forEach(key => {
        // Exclude technical fields that shouldn't be used for coloring
        if (!['id', 'name'].includes(key)) {
          allKeys.add(key);
        }
      });
    });
    
    return Array.from(allKeys);
  };

  // Combine traits from availableTraits and dynamically detected traits
  const dynamicTraitNames = getAvailableTraitNames();
  const existingTraitNames = new Set(availableTraits.map(t => t.name));
  
  const allTraits = [
    // Include traits from availableTraits that actually exist in samples
    ...availableTraits.filter(trait => dynamicTraitNames.includes(trait.name)).map(trait => ({
      name: trait.name,
      displayName: trait.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: trait.type
    })),
    // Include traits that exist in samples but not in availableTraits
    ...dynamicTraitNames
      .filter(traitName => !existingTraitNames.has(traitName))
      .map(traitName => ({
        name: traitName,
        displayName: traitName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: detectTraitType(traitName)
      }))
  ].sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Auto-select a valid trait if current selection is not available
  React.useEffect(() => {
    if (allTraits.length > 0 && !allTraits.some(trait => trait.name === selectedTrait)) {
      // Prefer 'condition' if available, otherwise select the first trait
      const preferredTrait = allTraits.find(trait => trait.name === 'condition') || allTraits[0];
      onTraitChange(preferredTrait.name);
    }
  }, [allTraits, selectedTrait, onTraitChange]);

  // Show message if no traits are available
  if (allTraits.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} className="text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Color Points By</h3>
        </div>
        <div className="text-sm text-gray-500">
          No traits available for coloring. Upload data with sample metadata to enable trait-based coloring.
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Palette size={18} className="text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Color Points By</h3>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="trait-selector" className="block text-sm font-medium text-gray-700">
          Select trait for coloring:
        </label>
        <select
          id="trait-selector"
          value={selectedTrait}
          onChange={(e) => onTraitChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
        >
          {allTraits.map(trait => (
            <option key={trait.name} value={trait.name}>
              {trait.displayName} ({trait.type})
            </option>
          ))}
        </select>
      </div>
      
      {selectedTrait && (
        <div className="mt-3 text-xs text-gray-500">
          Points will be colored based on the selected trait values
        </div>
      )}
    </div>
  );
};