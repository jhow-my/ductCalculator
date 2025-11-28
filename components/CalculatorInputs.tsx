
import React, { useMemo, useState, useEffect } from 'react';
import { DuctShape, DuctDimensions } from '../types';
import { FittingDiagram } from './FittingDiagram';
import { Hash, ChevronDown, Loader2, Calculator } from 'lucide-react';
import { FITTING_DB, CATEGORIES, RADIUS_RATIO_OPTIONS, ANGLE_OPTIONS } from '../constants/fittings';

interface CalculatorInputsProps {
  fittingType: string;
  ashraeCode: string;
  shape: DuctShape;
  dimensions: DuctDimensions;
  cfm: string;
  angle: number;
  radiusRatio: number;
  showSiUnits: boolean;
  isLoading: boolean;
  onFittingTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  setShowSiUnits: (show: boolean) => void;
  handleDimChange: (field: keyof DuctDimensions, val: string) => void;
  handleFlowChange: (val: string) => void;
  setRadiusRatio: (val: number) => void;
  setAngle: (val: number) => void;
  onCalculate: () => void;
  onClear: () => void;
  cfm2?: string;
  handleFlow2Change?: (val: string) => void;
  pressurePath?: 'main' | 'branch';
  setPressurePath?: (path: 'main' | 'branch') => void;
  roughness?: number;
  setRoughness?: (val: number) => void;
}

export const CalculatorInputs: React.FC<CalculatorInputsProps> = (props) => {
  const {
    fittingType, ashraeCode, shape, dimensions, cfm, angle, radiusRatio,
    showSiUnits, isLoading, onFittingTypeChange, setShowSiUnits,
    handleDimChange, handleFlowChange, setRadiusRatio, setAngle, onCalculate, onClear,
    cfm2, handleFlow2Change, pressurePath, setPressurePath, roughness, setRoughness
  } = props;

  const getUnitLabel = (type: 'len' | 'flow') => showSiUnits ? (type === 'len' ? 'mm' : 'cmh') : (type === 'len' ? 'in' : 'cfm');
  const formatDisplayVal = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '';
    return showSiUnits ? Math.round(val * 25.4) : parseFloat(val.toFixed(2));
  };

  const displayWidth = formatDisplayVal(dimensions.width);
  const displayHeight = formatDisplayVal(dimensions.height);
  const displayWidth2 = formatDisplayVal(dimensions.width2);
  const displayHeight2 = formatDisplayVal(dimensions.height2);
  const displayWidth3 = formatDisplayVal(dimensions.width3);
  const displayHeight3 = formatDisplayVal(dimensions.height3);
  const displayDiameter = formatDisplayVal(dimensions.diameter);
  const displayLength = formatDisplayVal(dimensions.length);
  
  const getDisplayFlow = (valStr: string | undefined, isSi: boolean) => {
    if (!valStr || valStr === '') return '';
    const val = parseFloat(valStr);
    return isNaN(val) ? '' : Math.round(isSi ? val * 1.699 : val).toString();
  };

  const displayFlow = getDisplayFlow(cfm, showSiUnits);
  const displayFlow2 = getDisplayFlow(cfm2, showSiUnits);

  const isElbowOrCR31 = fittingType.toLowerCase().includes('elbow') || ashraeCode === 'CR3-1';
  const isSD42 = ashraeCode === 'SD4-2';
  const isSR42 = ashraeCode === 'SR4-2';
  const isSR43 = ashraeCode === 'SR4-3';
  const isER42 = ashraeCode === 'ER4-2';
  const isER43 = ashraeCode === 'ER4-3';
  const isED42 = ashraeCode === 'ED4-2';
  const isSR513 = ashraeCode === 'SR5-13';
  const isER53 = ashraeCode === 'ER5-3';
  const isSR515 = ashraeCode === 'SR5-15';
  const isER55 = ashraeCode === 'ER5-5';
  const isCR111 = ashraeCode === 'CR11-1';

  const isTee = isSR513 || isER53 || isSR515 || isER55;
  const isBullhead = isSR515 || isER55;

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

  // --- Roughness Handling with Local State ---
  // We use local state to prevent cursor jumping/decimal eating issues during typing
  const [localRoughness, setLocalRoughness] = useState<string>('');

  // Sync local state when props change (unit switch or external clear)
  useEffect(() => {
    if (roughness === undefined) {
      setLocalRoughness('');
      return;
    }
    // Calculate what the display value *should* be based on current prop
    const propDisplayVal = showSiUnits ? (roughness * 304.8) : roughness;
    const currentParsed = parseFloat(localRoughness);

    // Only update local state if it differs significantly from prop or if state is empty/invalid
    // This allows external resets (like 'Clear') to work while preserving user typing
    if (isNaN(currentParsed) || Math.abs(currentParsed - propDisplayVal) > 0.000001) {
       // Avoid aggressive rounding that kills precision during unit switch, but keep clean for initial load
       setLocalRoughness(showSiUnits ? propDisplayVal.toFixed(4) : propDisplayVal.toString());
    }
  }, [roughness, showSiUnits]);

  const handleLocalRoughnessChange = (valStr: string) => {
      // Allow empty string to clear input
      if (valStr === '') {
          setLocalRoughness('');
          if (setRoughness) setRoughness(0);
          return;
      }

      // Regex to allow numbers, one decimal point
      if (!/^\d*\.?\d*$/.test(valStr)) return;

      // Limit to 4 decimal places
      if (valStr.includes('.')) {
          const parts = valStr.split('.');
          if (parts[1].length > 4) return;
      }

      setLocalRoughness(valStr);

      const val = parseFloat(valStr);
      if (!isNaN(val) && setRoughness) {
          // Convert back to Feet for internal state
          if (showSiUnits) {
              setRoughness(val / 304.8); // mm to ft
          } else {
              setRoughness(val); // ft to ft
          }
      }
  };

  // Validation Logic
  const isFormValid = useMemo(() => {
    const isPositive = (val: number | undefined) => val !== undefined && !isNaN(val) && val > 0;
    const isFlowValid = (val: string | undefined) => {
        if (!val) return false;
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    };

    // 1. Base Dimensions
    if (shape === DuctShape.RECTANGULAR) {
        if (!isPositive(dimensions.width) || !isPositive(dimensions.height)) return false;
    } else {
        if (!isPositive(dimensions.diameter)) return false;
    }

    // 2. Airflow (Main)
    if (!isFlowValid(cfm)) return false;

    // 3. Fitting Specifics
    // Transitions Length & Outlets
    if (isSD42 || isER43) { 
        if (!isPositive(dimensions.diameter) || !isPositive(dimensions.length)) return false;
    }
    if (isSR43 || isED42) { 
        if (!isPositive(dimensions.width) || !isPositive(dimensions.height) || !isPositive(dimensions.length)) return false;
    }
    if (isSR42 || isER42) {
        if (!isPositive(dimensions.width2) || !isPositive(dimensions.height2) || !isPositive(dimensions.length)) return false;
    }
    // Straight Duct
    if (isCR111) {
        if (!isPositive(dimensions.length)) return false;
    }

    // Tees
    if (isTee) {
        // Branch Width (Always required)
        if (!isPositive(dimensions.width2)) return false;
        
        // Branch Flow (Always required for current tees)
        if (!isFlowValid(cfm2)) return false;

        // Branch Height (Most Rect Tees have Hb, except Bullhead uses H)
        if (!isBullhead) {
            if (!isPositive(dimensions.height2)) return false;
        }

        // Bullhead Branch 2 Width
        if (isBullhead) {
            if (!isPositive(dimensions.width3)) return false;
        }

        // Main Downstream/Upstream (SR5-13, ER5-3)
        if (!isBullhead) {
             if (!isPositive(dimensions.width3) || !isPositive(dimensions.height3)) return false;
        }
    }

    // Elbows
    if (isElbowOrCR31) {
        if (!isPositive(radiusRatio)) return false;
    }

    return true;
  }, [
      shape, dimensions, cfm, cfm2, radiusRatio, 
      isSD42, isER43, isSR43, isED42, isSR42, isER42, isTee, isBullhead, isElbowOrCR31, isCR111
  ]);

  return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
           <div className="flex items-center gap-3">
             <h2 className="font-bold text-slate-800 text-lg">Input</h2>
           </div>
           <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <span className={`text-xs font-bold ${!showSiUnits ? 'text-blue-600' : 'text-slate-400'}`}>IP (in, cfm)</span>
                <button onClick={() => setShowSiUnits(!showSiUnits)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showSiUnits ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showSiUnits ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-bold ${showSiUnits ? 'text-blue-600' : 'text-slate-400'}`}>SI (mm, cmh)</span>
            </div>
        </div>

        <div className="p-8">
            <div className="space-y-8">
                {/* 1. Fitting Identification Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Fitting Type</label>
                        <div className="relative">
                            <select value={fittingType} onChange={onFittingTypeChange} className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 shadow-sm font-medium">
                                {CATEGORIES.map(cat => (
                                    <optgroup key={cat} label={cat}>
                                        {FITTING_DB.filter(f => f.category === cat)
                                            .sort((a, b) => a.name.localeCompare(b.name)) 
                                            .map(f => (
                                            <option key={f.code} value={f.name}>{f.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">ASHRAE Fitting No.</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Hash className="h-4 w-4 text-slate-400" />
                            </div>
                            <input type="text" value={ashraeCode} readOnly className="bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-lg block w-full pl-10 p-3 font-mono cursor-not-allowed shadow-inner" />
                        </div>
                     </div>
                </div>

                {/* 2. Fitting Diagram */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 h-full min-h-[250px] flex items-center justify-center">
                    <FittingDiagram type={fittingType} shape={shape} angle={angle} ashraeCode={ashraeCode} />
                </div>

                {/* 3. Main Input Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Dimensions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {shape === DuctShape.RECTANGULAR && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {isTee 
                                                ? (isER53 || isER55 ? 'Common Width (Wc) - Downstream' : 'Common Width (Wc)') 
                                                : isSR42 
                                                    ? 'Inlet Width (W1)' 
                                                    : isSD42 
                                                        ? 'Inlet Width (W1)'
                                                        : isER42 || isER43 
                                                            ? 'Inlet Width (Wo)' 
                                                            : isSR43 || isED42 
                                                                ? 'Outlet Width (Wo)' 
                                                                : 'Width (W)'}
                                        </label>
                                        <div className="relative">
                                            <input type="number" value={displayWidth} onChange={(e) => handleDimChange('width', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {isTee 
                                                ? (isER53 || isER55 || isSR515 ? 'Height (H)' : 'Common Height (Hc)') 
                                                : isSR42
                                                    ? 'Inlet Height (H1)' 
                                                    : isSD42
                                                        ? 'Inlet Height (H1)'
                                                        : isER42 || isER43 
                                                            ? 'Inlet Height (Ho)' 
                                                            : isSR43 || isED42 
                                                                ? 'Outlet Height (Ho)' 
                                                                : 'Height (H)'}
                                        </label>
                                        <div className="relative">
                                            <input type="number" value={displayHeight} onChange={(e) => handleDimChange('height', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {shape === DuctShape.ROUND && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        {isSD42 || isSR43 || isED42 ? 'Inlet Diameter (D1)' : isER43 ? 'Outlet Diameter (D1)' : 'Duct Diameter (D)'}
                                    </label>
                                    <div className="relative">
                                        <input type="number" value={displayDiameter} onChange={(e) => handleDimChange('diameter', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                    </div>
                                </div>
                            )}

                            {(isSR43 || isED42) && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Outlet Width (Wo)</label>
                                        <div className="relative">
                                            <input type="number" value={displayWidth} onChange={(e) => handleDimChange('width', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Outlet Height (Ho)</label>
                                        <div className="relative">
                                            <input type="number" value={displayHeight} onChange={(e) => handleDimChange('height', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {(isSR42 || isER42) && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {isSR42 ? 'Outlet Width (Wo)' : 'Outlet Width (W1)'}
                                        </label>
                                        <div className="relative">
                                            <input type="number" value={displayWidth2} onChange={(e) => handleDimChange('width2', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {isSR42 ? 'Outlet Height (Ho)' : 'Outlet Height (H1)'}
                                        </label>
                                        <div className="relative">
                                            <input type="number" value={displayHeight2} onChange={(e) => handleDimChange('height2', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {isTee && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{isBullhead ? 'Branch 1 Width (Wb1)' : 'Branch Width (Wb)'}</label>
                                        <div className="relative">
                                            <input type="number" value={displayWidth2} onChange={(e) => handleDimChange('width2', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                    {!isBullhead && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Branch Height (Hb)</label>
                                            <div className="relative">
                                                <input type="number" value={displayHeight2} onChange={(e) => handleDimChange('height2', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                            </div>
                                        </div>
                                    )}
                                    {isBullhead && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Branch 2 Width (Wb2)</label>
                                            <div className="relative">
                                                <input type="number" value={displayWidth3} onChange={(e) => handleDimChange('width3', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {isTee && !isBullhead && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{isER53 ? 'Upstream Main Width (Ws)' : 'Downstream Main Width (Ws)'}</label>
                                        <div className="relative">
                                            <input type="number" value={displayWidth3} onChange={(e) => handleDimChange('width3', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{isER53 ? 'Upstream Main Height (Hs)' : 'Downstream Main Height (Hs)'}</label>
                                        <div className="relative">
                                            <input type="number" value={displayHeight3} onChange={(e) => handleDimChange('height3', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {(isSD42 || isER43) && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Outlet Diameter</label>
                                    <div className="relative">
                                        <input type="number" value={displayDiameter} onChange={(e) => handleDimChange('diameter', e.target.value)} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" placeholder="0" />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">{getUnitLabel('len')}</span>
                                    </div>
                                </div>
                            )}

                            {(isSD42 || isSR42 || isSR43 || isER42 || isER43 || isED42 || isCR111) && (
                                <div className={isCR111 ? "" : "col-span-2"}>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Length (L)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={isCR111 && !showSiUnits && dimensions.length !== undefined && !isNaN(dimensions.length) 
                                                ? parseFloat((dimensions.length / 12).toFixed(3)) // Display Feet for CR11-1 in IP mode
                                                : displayLength
                                            } 
                                            onChange={(e) => {
                                                if (isCR111 && !showSiUnits) {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) {
                                                        // Input is Feet, store as Inches (val * 12)
                                                        handleDimChange('length', (val * 12).toString());
                                                    } else {
                                                        handleDimChange('length', '');
                                                    }
                                                } else {
                                                    handleDimChange('length', e.target.value);
                                                }
                                            }}
                                            onWheel={handleWheel} 
                                            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" 
                                            placeholder="0" 
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                                            {isCR111 && !showSiUnits ? 'ft' : getUnitLabel('len')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isCR111 && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Abs. Roughness (e)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            value={localRoughness} 
                                            onChange={(e) => handleLocalRoughnessChange(e.target.value)} 
                                            onWheel={handleWheel} 
                                            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono shadow-sm" 
                                            placeholder="0.0003" 
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">{showSiUnits ? 'mm' : 'ft'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6 flex flex-col">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Airflow</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{isTee ? (isER53 || isER55 || isSR515 ? 'Common Flow Rate (Qc)' : 'Common Flow Rate (Qc)') : 'Flow Rate (Q)'}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><div className={`h-2 w-2 rounded-full ${cfm ? 'bg-green-400' : 'bg-slate-300'}`}></div></div>
                                        <input type="number" value={displayFlow} onChange={(e) => handleFlowChange(e.target.value)} onWheel={handleWheel} className="bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-lg block w-full pl-8 p-2.5 font-bold font-mono shadow-sm" placeholder="0" />
                                        <span className="absolute right-3 top-2.5 text-xs font-bold text-blue-400">{getUnitLabel('flow')}</span>
                                    </div>
                                </div>

                                {isTee && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{isBullhead ? 'Branch 1 Flow Rate (Qb1)' : 'Branch Flow Rate (Qb)'}</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><div className={`h-2 w-2 rounded-full ${cfm2 ? 'bg-green-400' : 'bg-slate-300'}`}></div></div>
                                            <input type="number" value={displayFlow2} onChange={(e) => handleFlow2Change && handleFlow2Change(e.target.value)} onWheel={handleWheel} className="bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-lg block w-full pl-8 p-2.5 font-bold font-mono shadow-sm" placeholder="0" />
                                            <span className="absolute right-3 top-2.5 text-xs font-bold text-blue-400">{getUnitLabel('flow')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isElbowOrCR31 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Geometry</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Angle (Θ)</label>
                                        <div className="relative">
                                            <select value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block p-2.5 font-mono">
                                                {ANGLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}°</option>)}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"><ChevronDown className="h-4 w-4" /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Radius Ratio (r/W)</label>
                                        <div className="relative">
                                            <input type="number" list="radius-options" value={radiusRatio} onChange={(e) => setRadiusRatio(parseFloat(e.target.value))} onWheel={handleWheel} className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 font-mono" />
                                            <datalist id="radius-options">{RADIUS_RATIO_OPTIONS.map(opt => <option key={opt} value={opt} />)}</datalist>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isTee && setPressurePath && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Calculation Path</h3>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="path" checked={pressurePath === 'main'} onChange={() => setPressurePath('main')} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-slate-700">{isBullhead ? 'Branch 1' : 'Main Path (Straight)'}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="path" checked={pressurePath === 'branch'} onChange={() => setPressurePath('branch')} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-slate-700">{isBullhead ? 'Branch 2' : 'Branch Path (Turn)'}</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow"></div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={onCalculate} 
                                disabled={isLoading || !isFormValid} 
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg shadow-md transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                                <span>Calculate</span>
                            </button>
                            <button onClick={onClear} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-lg transition-colors">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
  );
};
