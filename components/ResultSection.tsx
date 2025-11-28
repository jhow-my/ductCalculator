
import React from 'react';
import { FittingResult, DuctShape } from '../types';
import { Plus, Info, Lightbulb, Wind, Gauge, TrendingUp, Activity } from 'lucide-react';

interface ResultSectionProps {
  currentResult: FittingResult | null;
  showSiUnits: boolean;
  onAddToProject: () => void;
}

export const ResultSection: React.FC<ResultSectionProps> = ({ currentResult, showSiUnits, onAddToProject }) => {
  if (!currentResult) return null;

  // Helpers
  const getUnitLabel = (type: 'len' | 'flow' | 'vel' | 'press') => {
    if (showSiUnits) {
      switch(type) {
        case 'len': return 'mm';
        case 'flow': return 'cmh';
        case 'vel': return 'm/s';
        case 'press': return 'Pa';
      }
    } else {
      switch(type) {
        case 'len': return 'in';
        case 'flow': return 'cfm';
        case 'vel': return 'fpm';
        case 'press': return 'in. wg';
      }
    }
  };

  const formatVal = (val: number, type: 'len' | 'flow' | 'vel' | 'press') => {
    if (showSiUnits) {
        switch(type) {
            case 'len': return Math.round(val * 25.4);
            case 'flow': return Math.round(val * 1.699).toLocaleString();
            case 'vel': return (val * 0.00508).toFixed(2);
            case 'press': return (val * 249.089).toFixed(2);
        }
    }
    // For Imperial: 
    // Flow: Integer
    // Length: Max 2 decimals
    // Others: 2 decimals
    if (type === 'flow') return Math.round(val).toLocaleString();
    if (type === 'len') return parseFloat(val.toFixed(2)); 
    return val.toFixed(2);
  };

  const getResultDisplayString = (res: FittingResult) => {
      const unit = showSiUnits ? 'mm' : 'inch';
      
      // Helper to format dimensions based on unit setting
      const fmt = (val: number | undefined) => formatVal(val || 0, 'len');

      if (res.ashraeCode === 'SD4-2') {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} to ø${fmt(res.dimensions.diameter)} ${unit}, L=${fmt(res.dimensions.length)} ${unit}`;
      }
      if (res.ashraeCode === 'SR4-3') {
          return `${res.fittingType}, ø${fmt(res.dimensions.diameter)} to ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} ${unit}, L=${fmt(res.dimensions.length)} ${unit}`;
      }
      if (res.ashraeCode === 'ER4-3') {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} to ø${fmt(res.dimensions.diameter)} ${unit}, L=${fmt(res.dimensions.length)} ${unit}`;
      }
      if (res.ashraeCode === 'SR4-2' || res.ashraeCode === 'ER4-2') {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} to ${fmt(res.dimensions.width2)}x${fmt(res.dimensions.height2)} ${unit}, L=${fmt(res.dimensions.length)} ${unit}`;
      }
      if (res.ashraeCode === 'SR5-13' || res.ashraeCode === 'ER5-3') {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} w/ ${fmt(res.dimensions.width2)}x${fmt(res.dimensions.height2)} Branch ${unit}`;
      }
      if (res.ashraeCode === 'CD8-5') {
          return `${res.fittingType}, ø${fmt(res.dimensions.diameter)} ${unit}`;
      }
      if (res.ashraeCode === 'CR9-3' || res.ashraeCode === 'CR9-5') {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} ${unit}`;
      }
      if (res.ashraeCode === 'CR11-1') {
          const lenStr = showSiUnits ? `${fmt(res.dimensions.length)} ${unit}` : `${parseFloat(((res.dimensions.length || 0) / 12).toFixed(2))} ft`;
          return `${res.fittingType}, ${fmt(res.dimensions.width)}x${fmt(res.dimensions.height)} ${unit}, L=${lenStr}`;
      }
      if (res.shape === DuctShape.RECTANGULAR) {
          return `${res.fittingType}, ${fmt(res.dimensions.width)}×${fmt(res.dimensions.height)} ${unit}`;
      } else {
          return `${res.fittingType}, ${fmt(res.dimensions.diameter)} ${unit} diameter`;
      }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 animate-fade-in shadow-sm">
        <div>
          <div className="flex justify-between items-start">
              <div>
                  <h3 className="text-xl font-bold text-indigo-900">Calculation Result</h3>
                  <p className="text-indigo-600 text-sm mt-1">{getResultDisplayString(currentResult)}</p>
              </div>
              <button 
                  onClick={onAddToProject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                  <Plus className="w-4 h-4" />
                  Add to Schedule
              </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {/* Velocity */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                      <Wind className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Velocity</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                      {formatVal(currentResult.velocity, 'vel')} <span className="text-xs font-normal text-slate-400">{getUnitLabel('vel')}</span>
                  </div>
              </div>

              {/* Velocity Pressure */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Vel. Pressure</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                      {formatVal(currentResult.velocityPressure, 'press')} <span className="text-xs font-normal text-slate-400">{getUnitLabel('press')}</span>
                  </div>
              </div>

              {/* Coefficient */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Coefficient (C)</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                      {currentResult.coefficient.toFixed(2)}
                  </div>
              </div>

              {/* Total Loss */}
              <div className="bg-blue-600 p-3 rounded-lg border border-blue-700 shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-3 h-3 text-blue-200" />
                      <span className="text-xs text-blue-100 uppercase font-semibold tracking-wider">Total Loss</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                      {formatVal(currentResult.totalPressureLoss, 'press')} <span className="text-xs font-normal text-blue-200">{getUnitLabel('press')}</span>
                  </div>
              </div>
          </div>

          {/* AI Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/50 rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-indigo-900 uppercase">Calculation Basis</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {currentResult.aiReasoning || "Standard ASHRAE calculation."}
                  </p>
              </div>
              <div className="bg-yellow-50/80 rounded-lg p-4 border border-yellow-100">
                  <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <h4 className="text-xs font-bold text-yellow-800 uppercase">Design Tip</h4>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                      {currentResult.aiTip || "Minimize fittings to reduce system pressure drop."}
                  </p>
              </div>
          </div>
        </div>
    </div>
  );
};
