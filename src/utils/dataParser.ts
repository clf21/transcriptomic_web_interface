import { Sample, GeneExpression, ValidationError } from '../types';
import { TraitInfo } from '../types';

export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    // Simple CSV parser - handles basic cases
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
};

export const validateSampleData = (data: string[][]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (data.length < 2) {
    errors.push({
      type: 'error',
      message: 'File must contain at least a header row and one data row'
    });
    return errors;
  }
  
  const headers = data[0].map(h => h.toLowerCase().trim());
  const sampleNameIndex = headers.findIndex(h => 
    h.includes('sample') && h.includes('name') || h === 'sample_name' || h === 'samplename'
  );
  
  if (sampleNameIndex === -1) {
    errors.push({
      type: 'error',
      message: 'Sample information table must contain a "Sample Name" column',
      field: 'Sample Name'
    });
  }
  
  // Check for duplicate sample names
  if (sampleNameIndex !== -1) {
    const sampleNames = data.slice(1).map(row => row[sampleNameIndex]);
    const duplicates = sampleNames.filter((name, index) => sampleNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      errors.push({
        type: 'error',
        message: `Duplicate sample names found: ${[...new Set(duplicates)].join(', ')}`
      });
    }
  }
  
  return errors;
};

export const validateExpressionData = (data: string[][], sampleNames: string[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (data.length < 2) {
    errors.push({
      type: 'error',
      message: 'Expression matrix must contain at least a header row and one data row'
    });
    return errors;
  }
  
  const headers = data[0];
  const geneColumnIndex = headers.findIndex(h => 
    h.toLowerCase().includes('gene') || h.toLowerCase().includes('id')
  );
  
  if (geneColumnIndex === -1) {
    errors.push({
      type: 'error',
      message: 'Expression matrix must contain a gene identifier column (e.g., "Gene ID", "Gene Name")'
    });
  }
  
  // Check if sample names match
  const expressionSamples = headers.slice(1).filter((_, i) => i !== geneColumnIndex - 1);
  const missingSamples = sampleNames.filter(name => !expressionSamples.includes(name));
  const extraSamples = expressionSamples.filter(name => !sampleNames.includes(name));
  
  if (missingSamples.length > 0) {
    errors.push({
      type: 'error',
      message: `Expression matrix missing columns for samples: ${missingSamples.join(', ')}`
    });
  }
  
  if (extraSamples.length > 0) {
    errors.push({
      type: 'warning',
      message: `Expression matrix contains extra samples not in sample info: ${extraSamples.join(', ')}`
    });
  }
  
  return errors;
};

export const parseSampleData = (csvText: string): { 
  samples: Sample[], 
  errors: ValidationError[],
  availableTraits: TraitInfo[]
} => {
  try {
    const data = parseCSV(csvText);
    const errors = validateSampleData(data);
    
    if (errors.some(e => e.type === 'error')) {
      return { samples: [], errors, availableTraits: [] };
    }
    
    const headers = data[0].map(h => h.toLowerCase().trim());
    const sampleNameIndex = headers.findIndex(h => 
      h.includes('sample') && h.includes('name') || h === 'sample_name' || h === 'samplename'
    );
    
    const conditionIndex = headers.findIndex(h => h.includes('condition') || h.includes('group'));
    const replicateIndex = headers.findIndex(h => h.includes('replicate') || h.includes('rep'));
    const batchIndex = headers.findIndex(h => h.includes('batch'));
    
    // Create flexible sample objects with all available traits
    const samples: Sample[] = data.slice(1).map((row, index) => ({
      id: row[sampleNameIndex] || `sample_${index}`,
      name: row[sampleNameIndex] || `Sample_${index}`,
      condition: conditionIndex !== -1 ? row[conditionIndex] : 'Unknown',
      replicate: replicateIndex !== -1 ? parseInt(row[replicateIndex]) || 1 : 1,
      batch: batchIndex !== -1 ? row[batchIndex] : 'Batch_1',
      librarySize: 45000000, // Default values - could be parsed if columns exist
      mappingRate: 92.0,
      rnaIntegrity: 8.0,
      sequencingDepth: 50000000,
      // Add all other columns as additional traits
      ...Object.fromEntries(
        headers.map((header, headerIndex) => [
          header.replace(/[^a-zA-Z0-9]/g, '_'), // Clean header name
          row[headerIndex] || ''
        ])
      )
    }));
    
    // Analyze available traits
    const availableTraits: TraitInfo[] = headers
      .filter(header => header !== headers[sampleNameIndex]) // Exclude sample name
      .map(header => {
        const cleanHeader = header.replace(/[^a-zA-Z0-9]/g, '_');
        const values = data.slice(1).map(row => row[headers.indexOf(header)] || '');
        const uniqueValues = [...new Set(values)].filter(v => v !== '');
        
        // Determine if trait is numerical or categorical
        const isNumerical = uniqueValues.every(val => !isNaN(Number(val)) && val !== '');
        
        return {
          name: cleanHeader,
          type: isNumerical && uniqueValues.length > 5 ? 'numerical' : 'categorical',
          values: uniqueValues,
          uniqueCount: uniqueValues.length
        };
      })
      .filter(trait => trait.uniqueCount > 1 && trait.uniqueCount < 20); // Filter useful traits
    
    return { samples, errors, availableTraits };
  } catch (error) {
    return {
      samples: [],
      errors: [{
        type: 'error',
        message: `Failed to parse sample data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      availableTraits: []
    };
  }
};

export const parseExpressionData = (
  csvText: string, 
  sampleNames: string[]
): { geneExpression: GeneExpression[], errors: ValidationError[] } => {
  try {
    const data = parseCSV(csvText);
    const errors = validateExpressionData(data, sampleNames);
    
    if (errors.some(e => e.type === 'error')) {
      return { geneExpression: [], errors };
    }
    
    const headers = data[0];
    const geneColumnIndex = headers.findIndex(h => 
      h.toLowerCase().includes('gene') || h.toLowerCase().includes('id')
    );
    
    const geneExpression: GeneExpression[] = data.slice(1).map((row, index) => {
      const samples: Record<string, number> = {};
      
      headers.forEach((header, headerIndex) => {
        if (headerIndex !== geneColumnIndex && sampleNames.includes(header)) {
          const value = parseFloat(row[headerIndex]);
          samples[header] = isNaN(value) ? 0 : value;
        }
      });
      
      return {
        geneId: `gene_${index}`,
        geneName: row[geneColumnIndex] || `Gene_${index}`,
        samples
      };
    });
    
    return { geneExpression, errors };
  } catch (error) {
    return {
      geneExpression: [],
      errors: [{
        type: 'error',
        message: `Failed to parse expression data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
};