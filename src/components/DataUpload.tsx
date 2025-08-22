import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ValidationError } from '../types';
import { parseSampleData, parseExpressionData } from '../utils/dataParser';

interface DataUploadProps {
  onDataUpload: (samples: any[], geneExpression: any[]) => void;
  onClose: () => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onDataUpload, onClose }) => {
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [sampleErrors, setSampleErrors] = useState<ValidationError[]>([]);
  const [expressionErrors, setExpressionErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState<'sample' | 'expression' | 'complete'>('sample');
  const [parsedSamples, setParsedSamples] = useState<any[]>([]);
  
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const expressionFileRef = useRef<HTMLInputElement>(null);

  const handleSampleFileUpload = async (file: File) => {
    setSampleFile(file);
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const { samples, errors, availableTraits } = parseSampleData(text);
      
      setSampleErrors(errors);
      
      if (errors.every(e => e.type !== 'error')) {
        setParsedSamples(samples);
        // Store available traits for later use
        (window as any).availableTraits = availableTraits;
        setUploadStep('expression');
      }
    } catch (error) {
      setSampleErrors([{
        type: 'error',
        message: 'Failed to read file. Please ensure it is a valid CSV file.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpressionFileUpload = async (file: File) => {
    setExpressionFile(file);
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const sampleNames = parsedSamples.map(s => s.name);
      const { geneExpression, errors } = parseExpressionData(text, sampleNames);
      
      setExpressionErrors(errors);
      
      if (errors.every(e => e.type !== 'error')) {
        onDataUpload(parsedSamples, geneExpression);
        setUploadStep('complete');
        // Ensure data persists after upload
        console.log('Data upload completed successfully', { 
          samples: parsedSamples.length, 
          genes: geneExpression.length 
        });
      }
    } catch (error) {
      setExpressionErrors([{
        type: 'error',
        message: 'Failed to read file. Please ensure it is a valid CSV file.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setSampleFile(null);
    setExpressionFile(null);
    setSampleErrors([]);
    setExpressionErrors([]);
    setParsedSamples([]);
    setUploadStep('sample');
  };

  const ErrorDisplay: React.FC<{ errors: ValidationError[] }> = ({ errors }) => (
    <div className="space-y-2">
      {errors.map((error, index) => (
        <div
          key={index}
          className={`flex items-start gap-2 p-3 rounded-lg ${
            error.type === 'error' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <AlertCircle 
            size={16} 
            className={error.type === 'error' ? 'text-red-600 mt-0.5' : 'text-yellow-600 mt-0.5'} 
          />
          <div className="text-sm">
            <div className={error.type === 'error' ? 'text-red-800' : 'text-yellow-800'}>
              {error.message}
            </div>
            {error.field && (
              <div className={error.type === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                Field: {error.field}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload RNA-seq Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${uploadStep === 'sample' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                uploadStep === 'sample' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {uploadStep === 'sample' ? '1' : <CheckCircle size={16} />}
              </div>
              <span className="ml-2 font-medium">Sample Info</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${
              uploadStep === 'expression' ? 'text-blue-600' : 
              uploadStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                uploadStep === 'expression' ? 'bg-blue-100' : 
                uploadStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {uploadStep === 'complete' ? <CheckCircle size={16} /> : '2'}
              </div>
              <span className="ml-2 font-medium">Expression Data</span>
            </div>
          </div>

          {/* Step 1: Sample Information */}
          {uploadStep === 'sample' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Step 1: Upload Sample Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file containing sample metadata. Must include a "Sample Name" column.
                </p>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => sampleFileRef.current?.click()}
              >
                <input
                  ref={sampleFileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => e.target.files?.[0] && handleSampleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-lg font-medium text-gray-900 mb-2">
                  {sampleFile ? sampleFile.name : 'Choose sample information file'}
                </div>
                <div className="text-sm text-gray-500">
                  CSV format with headers including "Sample Name"
                </div>
              </div>

              {sampleErrors.length > 0 && <ErrorDisplay errors={sampleErrors} />}

              {parsedSamples.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle size={16} />
                    <span className="font-medium">Sample data parsed successfully!</span>
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Found {parsedSamples.length} samples
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Expression Data */}
          {uploadStep === 'expression' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Step 2: Upload Expression Matrix</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with gene expression counts. Column names must match sample names from step 1.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Expected sample names:</div>
                  <div className="text-blue-700">
                    {parsedSamples.map(s => s.name).join(', ')}
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => expressionFileRef.current?.click()}
              >
                <input
                  ref={expressionFileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => e.target.files?.[0] && handleExpressionFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-lg font-medium text-gray-900 mb-2">
                  {expressionFile ? expressionFile.name : 'Choose expression matrix file'}
                </div>
                <div className="text-sm text-gray-500">
                  CSV format with gene identifiers and sample columns
                </div>
              </div>

              {expressionErrors.length > 0 && <ErrorDisplay errors={expressionErrors} />}

              <div className="flex gap-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to Step 1
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {uploadStep === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Complete!</h3>
                <p className="text-gray-600">
                  Your data has been successfully uploaded and is ready for analysis.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Analysis
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Processing file...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};