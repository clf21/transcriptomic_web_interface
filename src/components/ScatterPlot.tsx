import React, { useRef, useEffect, useState } from 'react';
import { PlotPoint, PlotConfig } from '../types';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ScatterPlotProps {
  data: PlotPoint[];
  config: PlotConfig;
  onPointClick?: (point: PlotPoint) => void;
  legendData?: { label: string; color: string }[];
}

export const ScatterPlot: React.FC<ScatterPlotProps> = ({ 
  data, 
  config, 
  onPointClick,
  legendData
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PlotPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const plotWidth = config.width - margin.left - margin.right;
  const plotHeight = config.height - margin.top - margin.bottom;

  // Early return if no data to prevent rendering issues
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
        </div>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">No data available</div>
            <div className="text-sm">Upload data and run analysis to see results</div>
          </div>
        </div>
      </div>
    );
  }

  // Filter out invalid data points before calculating scales
  const validData = data.filter(point => 
    point && 
    typeof point.x === 'number' && 
    typeof point.y === 'number' && 
    isFinite(point.x) && 
    isFinite(point.y)
  );

  if (validData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
        </div>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Invalid data</div>
            <div className="text-sm">All data points contain invalid values</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate scales
  const xValues = validData.map(d => d.x);
  const yValues = validData.map(d => d.y);
  
  const xMin = Math.min(...xValues) * 1.1;
  const xMax = Math.max(...xValues) * 1.1;
  const yMin = Math.min(...yValues) * 1.1;
  const yMax = Math.max(...yValues) * 1.1;

  // Validate scale values and provide fallbacks
  const safeXMin = isFinite(xMin) ? xMin : -10;
  const safeXMax = isFinite(xMax) ? xMax : 10;
  const safeYMin = isFinite(yMin) ? yMin : -10;
  const safeYMax = isFinite(yMax) ? yMax : 10;

  const xScale = (value: number) => 
    isFinite(value) ? ((value - safeXMin) / (safeXMax - safeXMin)) * plotWidth : plotWidth / 2;
  
  const yScale = (value: number) => 
    isFinite(value) ? plotHeight - ((value - safeYMin) / (safeYMax - safeYMin)) * plotHeight : plotHeight / 2;

  // Generate grid lines
  const xTicks = Array.from({ length: 6 }, (_, i) => 
    safeXMin + (safeXMax - safeXMin) * (i / 5)
  );
  const yTicks = Array.from({ length: 6 }, (_, i) => 
    safeYMin + (safeYMax - safeYMin) * (i / 5)
  );

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  const exportPlot = () => {
    if (!svgRef.current) return;
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = config.width;
    canvas.height = config.height;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${config.title.replace(/\s+/g, '_').toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={exportPlot}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export Plot"
          >
            <Download size={18} />
          </button>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          width={config.width}
          height={config.height}
          className="border border-gray-200 rounded"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Background */}
          <rect
            width={config.width}
            height={config.height}
            fill="white"
          />

          {/* Grid lines */}
          {config.showGrid && (
            <g>
              {xTicks.map((tick, i) => (
                <line
                  key={`x-grid-${i}`}
                  x1={margin.left + xScale(tick)}
                  y1={margin.top}
                  x2={margin.left + xScale(tick)}
                  y2={config.height - margin.bottom}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
              ))}
              {yTicks.map((tick, i) => (
                <line
                  key={`y-grid-${i}`}
                  x1={margin.left}
                  y1={margin.top + yScale(tick)}
                  x2={config.width - margin.right}
                  y2={margin.top + yScale(tick)}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
              ))}
            </g>
          )}

          {/* Axes */}
          <g>
            {/* X-axis */}
            <line
              x1={margin.left}
              y1={config.height - margin.bottom}
              x2={config.width - margin.right}
              y2={config.height - margin.bottom}
              stroke="#374151"
              strokeWidth={2}
            />
            {/* Y-axis */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={config.height - margin.bottom}
              stroke="#374151"
              strokeWidth={2}
            />
          </g>

          {/* Axis labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={config.height - 10}
            textAnchor="middle"
            className="fill-gray-700 text-sm font-medium"
          >
            {config.xLabel}
          </text>
          <text
            x={15}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${margin.top + plotHeight / 2})`}
            className="fill-gray-700 text-sm font-medium"
          >
            {config.yLabel}
          </text>

          {/* Tick labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-tick-${i}`}
              x={margin.left + xScale(tick)}
              y={config.height - margin.bottom + 15}
              textAnchor="middle"
              className="fill-gray-600 text-xs"
            >
              {isFinite(tick) ? tick.toFixed(1) : '0'}
            </text>
          ))}
          {yTicks.map((tick, i) => (
            <text
              key={`y-tick-${i}`}
              x={margin.left - 10}
              y={margin.top + yScale(tick) + 4}
              textAnchor="end"
              className="fill-gray-600 text-xs"
            >
              {isFinite(tick) ? tick.toFixed(1) : '0'}
            </text>
          ))}

          {/* Data points */}
          {validData.map((point, i) => (
            <circle
              key={i}
              cx={margin.left + xScale(point.x)}
              cy={margin.top + yScale(point.y)}
              r={point.size || 4}
              fill={point.color || '#2563EB'}
              stroke="white"
              strokeWidth={1}
              className="cursor-pointer hover:stroke-2 transition-all"
              onMouseEnter={() => setHoveredPoint(point)}
              onClick={() => onPointClick?.(point)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10 text-sm"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
              transform: mousePosition.x > config.width - 150 ? 'translateX(-100%)' : 'none'
            }}
          >
            <div className="font-medium">{hoveredPoint.label}</div>
            <div>X: {isFinite(hoveredPoint.x) ? hoveredPoint.x.toFixed(3) : 'N/A'}</div>
            <div>Y: {isFinite(hoveredPoint.y) ? hoveredPoint.y.toFixed(3) : 'N/A'}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      {legendData && legendData.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {legendData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span 
                  className="text-sm text-gray-700" 
                  title={item.label}
                  style={{ 
                    maxWidth: '250px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};