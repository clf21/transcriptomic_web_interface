import React, { useState } from 'react';
import { Sample, TraitInfo } from '../types';
import { Search, Filter, Download } from 'lucide-react';

interface SampleInfoTableProps {
  samples: Sample[];
  availableTraits: TraitInfo[];
  onSampleSelect?: (sample: Sample) => void;
}

export const SampleInfoTable: React.FC<SampleInfoTableProps> = ({ 
  samples, 
  availableTraits,
  onSampleSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [sortField, setSortField] = useState<keyof Sample>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get all unique trait values for filtering
  const getUniqueTraitValues = (traitName: string) => {
    const values = new Set<string>();
    samples.forEach(sample => {
      const value = (sample as any)[traitName];
      if (value !== undefined && value !== null && value !== '') {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };

  // Find the main categorical trait for filtering (prefer condition-like traits)
  const getMainFilterTrait = () => {
    const preferredTraits = ['condition', 'treatment', 'group', 'type'];
    for (const preferred of preferredTraits) {
      const trait = availableTraits.find(t => 
        t.name.toLowerCase().includes(preferred) && t.type === 'categorical'
      );
      if (trait) return trait;
    }
    // Fallback to first categorical trait
    return availableTraits.find(t => t.type === 'categorical');
  };

  const mainFilterTrait = getMainFilterTrait();
  const filterValues = mainFilterTrait ? getUniqueTraitValues(mainFilterTrait.name) : [];

  const filteredSamples = samples
    .filter(sample => 
      sample.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCondition === 'all' || 
       (mainFilterTrait && (sample as any)[mainFilterTrait.name] === filterCondition))
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }
      return ((aVal as number) - (bVal as number)) * direction;
    });

  const handleSort = (field: keyof Sample) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportData = () => {
    if (samples.length === 0) return;
    
    // Get all column headers (sample name + available traits)
    const headers = ['name', ...availableTraits.map(t => t.name)];
    const csvContent = [
      headers.join(','),
      ...filteredSamples.map(sample => 
        headers.map(header => (sample as any)[header] || '').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_info.csv';
    a.click();
  };

  // Format trait values for display
  const formatTraitValue = (trait: TraitInfo, value: any) => {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    
    if (trait.type === 'numerical') {
      const num = Number(value);
      return isNaN(num) ? String(value) : num.toFixed(2);
    }
    
    return String(value);
  };

  // Get trait color for categorical values
  const getTraitColor = (trait: TraitInfo, value: any) => {
    if (trait.type !== 'categorical' || !value) return '';
    
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-orange-100 text-orange-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-red-100 text-red-800',
      'bg-yellow-100 text-yellow-800'
    ];
    
    const index = trait.values.indexOf(String(value));
    return index >= 0 ? colors[index % colors.length] : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Sample Information</h2>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search samples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {mainFilterTrait && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All {mainFilterTrait.name}</option>
                {filterValues.map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {/* Sample Name column (always first) */}
              <th
                className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Sample Name
                  {sortField === 'name' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              
              {/* Dynamic trait columns */}
              {availableTraits.map((trait) => (
                <th
                  key={trait.name}
                  className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort(trait.name as keyof Sample)}
                >
                  <div className="flex items-center gap-1">
                    {trait.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <span className="text-xs text-gray-500 ml-1">
                      ({trait.type === 'categorical' ? `${trait.uniqueCount} groups` : 'numeric'})
                    </span>
                    {sortField === trait.name && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSamples.map((sample, index) => (
              <tr
                key={sample.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
                onClick={() => onSampleSelect?.(sample)}
              >
                {/* Sample Name cell */}
                <td className="py-3 px-4 font-medium text-gray-900">{sample.name}</td>
                
                {/* Dynamic trait cells */}
                {availableTraits.map((trait) => {
                  const value = (sample as any)[trait.name];
                  const formattedValue = formatTraitValue(trait, value);
                  
                  return (
                    <td key={trait.name} className="py-3 px-4">
                      {trait.type === 'categorical' && value ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTraitColor(trait, value)}`}>
                          {formattedValue}
                        </span>
                      ) : (
                        <span className="text-gray-600">{formattedValue}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredSamples.length} of {samples.length} samples
      </div>
    </div>
  );
};