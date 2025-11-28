
import React from 'react';
import { FittingResult, DuctShape } from '../types';
import { Download, Trash2, Copy } from 'lucide-react';
import { generateSchedulePDF } from '../services/pdfService';

interface ProjectScheduleProps {
  projectRows: FittingResult[];
  totalProjectLoss: number;
  showSiUnits: boolean;
  systemNo: string;
  setSystemNo: (val: string) => void;
  setProjectRows: React.Dispatch<React.SetStateAction<FittingResult[]>>;
}

export const ProjectSchedule: React.FC<ProjectScheduleProps> = ({ 
  projectRows, 
  totalProjectLoss, 
  showSiUnits, 
  systemNo, 
  setSystemNo, 
  setProjectRows 
}) => {

  const handleDelete = (id: string) => {
    setProjectRows(prev => prev.filter(r => r.id !== id));
  };

  const duplicateRow = (row: FittingResult) => {
    const newRow = { ...row, id: crypto.randomUUID(), timestamp: Date.now() };
    const index = projectRows.findIndex(r => r.id === row.id);
    const newRows = [...projectRows];
    newRows.splice(index + 1, 0, newRow);
    setProjectRows(newRows);
  };

  const handleClearAll = () => {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to clear the entire schedule?')) {
          setProjectRows([]);
      }
  };

  const formatVal = (val: number, type: 'len' | 'flow' | 'vel' | 'press', isSi: boolean) => {
    if (isSi) {
        switch(type) {
            case 'len': return Math.round(val * 25.4).toString();
            case 'flow': return Math.round(val * 1.699).toLocaleString();
            case 'vel': return (val * 0.00508).toFixed(2);
            case 'press': return (val * 249.089).toFixed(2);
        }
    }
    if (type === 'flow') return Math.round(val).toLocaleString();
    if (type === 'len') return parseFloat(val.toFixed(2)).toString(); 
    return val.toFixed(2);
  };

  const formatDimensions = (res: FittingResult, isSi: boolean) => {
      const f = (v: number | undefined) => formatVal(v || 0, 'len', isSi);
      if (res.shape === DuctShape.ROUND) return `D${f(res.dimensions.diameter)}`;
      return `${f(res.dimensions.width)}x${f(res.dimensions.height)}`;
  };

  const formatSecondaryDescription = (row: FittingResult) => {
    let text = row.aiReasoning || row.fittingDescription || "";
    
    // 1. Remove Fitting Type and ASHRAE No. (Prefix)
    // Look for pattern like "Name (Code): " or "Name Code: "
    if (row.ashraeCode) {
        const escapedCode = row.ashraeCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Regex to match start of string up to the code and the following colon
        const prefixRegex = new RegExp(`^.*?${escapedCode}.*?:\\s*`, 'i');
        text = text.replace(prefixRegex, '');
    }
    
    // Fallback: check if it starts with fitting type name if code regex didn't catch it
    if (text.startsWith(row.fittingType)) {
        text = text.substring(row.fittingType.length).replace(/^[:\s]+/, '');
    }

    // 2. Remove Loss Coefficient info (Suffix) and keep Inputs
    // We split the string at keywords that typically introduce the result/coefficient part
    const separators = [
        " ->", 
        ". Base Cp=", 
        ". Re=", 
        ": Loss coefficient", 
        " Loss coefficient",
        " based on" 
    ];

    for (const sep of separators) {
        const idx = text.indexOf(sep);
        if (idx !== -1) {
            text = text.substring(0, idx);
        }
    }

    // Cleanup formatting
    text = text.replace(/^[,\s]+/, ''); // Remove leading comma/space
    text = text.replace(/[.,\s]+$/, ''); // Remove trailing punctuation

    return text;
  };

  const handleExportPDF = () => {
      generateSchedulePDF(projectRows, totalProjectLoss, showSiUnits, systemNo);
  };

  if (projectRows.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in mt-8">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800">System No.</h3>
                <input 
                    type="text" 
                    placeholder="e.g. EAF-01" 
                    value={systemNo}
                    onChange={(e) => setSystemNo(e.target.value)}
                    className="text-sm border border-slate-300 bg-white rounded-lg px-3 py-2 w-40 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                 />
            </div>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                 >
                    <Download className="w-4 h-4 text-red-600" />
                    Export PDF
                 </button>
            </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-center">No.</th>
                        <th className="px-4 py-3 text-center">ASHRAE No.</th>
                        <th className="px-4 py-3 text-left">Fitting Type</th>
                        <th className="px-4 py-3 text-center">Airflow ({showSiUnits ? 'CMH' : 'CFM'})</th>
                        <th className="px-4 py-3 text-center">Size ({showSiUnits ? 'mm' : 'in'})</th>
                        <th className="px-4 py-3 text-center">Velocity ({showSiUnits ? 'm/s' : 'FPM'})</th>
                        <th className="px-4 py-3 text-center">Coeff.</th>
                        <th className="px-4 py-3 text-center">Loss ({showSiUnits ? 'Pa' : 'in. wg'})</th>
                        <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {projectRows.map((row, index) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                             <td className="px-4 py-3 text-center font-bold text-lg text-slate-400">
                                {index + 1}
                             </td>
                             <td className="px-4 py-3 text-center font-medium text-slate-900 bg-slate-50/50 rounded-lg">
                                {row.ashraeCode || '-'}
                             </td>
                             <td className="px-4 py-3 max-w-xs" title={row.fittingDescription}>
                                <div className="font-medium text-slate-700 truncate">{row.fittingType}</div>
                                <div className="text-xs text-slate-500 truncate" title={row.aiReasoning}>
                                    {formatSecondaryDescription(row)}
                                </div>
                             </td>
                             <td className="px-4 py-3 text-center">
                                {formatVal(row.airflow, 'flow', showSiUnits)}
                             </td>
                             <td className="px-4 py-3 text-center font-mono text-sm font-normal text-slate-700">
                                {formatDimensions(row, showSiUnits)}
                             </td>
                             <td className="px-4 py-3 text-center">
                                {formatVal(row.velocity, 'vel', showSiUnits)}
                             </td>
                             <td className="px-4 py-3 text-center">
                                {row.coefficient.toFixed(2)}
                             </td>
                             <td className="px-4 py-3 text-center font-bold text-slate-800">
                                {formatVal(row.totalPressureLoss, 'press', showSiUnits)}
                             </td>
                             <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <button 
                                        onClick={() => duplicateRow(row)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors"
                                        title="Duplicate"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(row.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                             </td>
                        </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold text-slate-900">
                        <td colSpan={7} className="px-4 py-3 text-right uppercase text-xs tracking-wider">Total System Loss</td>
                        <td className="px-4 py-3 text-center text-base text-blue-600">
                            {formatVal(totalProjectLoss, 'press', showSiUnits)}
                        </td>
                        <td className="px-4 py-3 text-center">
                            {/* Clear button removed */}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
             {projectRows.map((row, index) => (
                 <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative">
                     <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                             <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded">{row.ashraeCode || `#${index+1}`}</span>
                             <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{row.fittingType}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="font-bold text-blue-600">{formatVal(row.totalPressureLoss, 'press', showSiUnits)} {showSiUnits ? 'Pa' : 'in.wg'}</span>
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded">
                         <div>Dim: {formatDimensions(row, showSiUnits)}</div>
                         <div>Flow: {formatVal(row.airflow, 'flow', showSiUnits)}</div>
                         <div>Vel: {formatVal(row.velocity, 'vel', showSiUnits)}</div>
                         <div>Coeff: {row.coefficient.toFixed(2)}</div>
                     </div>
                     {formatSecondaryDescription(row) && (
                        <div className="text-xs text-slate-500 mb-3 px-1 italic">
                            {formatSecondaryDescription(row)}
                        </div>
                     )}

                     <div className="flex justify-end gap-3 border-t border-slate-100 pt-2">
                         <button onClick={() => duplicateRow(row)} className="text-blue-500 hover:text-blue-700 p-1">
                             <Copy className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-600 p-1">
                             <Trash2 className="w-4 h-4" />
                         </button>
                     </div>
                 </div>
             ))}
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex justify-between items-center">
                 <span className="font-bold text-slate-700 uppercase text-xs">Total Loss</span>
                 <span className="font-bold text-blue-700 text-lg">{formatVal(totalProjectLoss, 'press', showSiUnits)} {showSiUnits ? 'Pa' : 'in.wg'}</span>
             </div>
        </div>
    </div>
  );
};
