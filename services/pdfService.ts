
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FittingResult, DuctShape } from '../types';

export const generateSchedulePDF = (
  projectRows: FittingResult[],
  totalProjectLoss: number,
  showSiUnits: boolean,
  systemNo: string
) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const unit = showSiUnits ? "(SI)" : "(IP)";
  
  doc.setFontSize(16);
  doc.text(`Duct Fitting Pressure Loss Schedule ${unit}`, 14, 15);
  
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

  // Removed Angle Column from Header
  const tableColumn = ["Type", "Description", "Size (mm)", "Airflow (cmh)", "Velocity (m/s)", "Coeff.", "Loss (Pa)"];
  
  if (!showSiUnits) {
     // Header update for IP
     tableColumn[2] = "Size (in)";
     tableColumn[3] = "Airflow (CFM)";
     tableColumn[4] = "Velocity (FPM)";
     tableColumn[6] = "Loss (in. wg)";
  }

  const tableRows = projectRows.map(row => {
     const dimStr = formatDimensions(row, showSiUnits);
     return [
       row.ashraeCode || (row.fittingType.length > 20 ? row.fittingType.substring(0, 20) + '...' : row.fittingType),
       row.fittingDescription,
       dimStr,
       formatVal(row.airflow, 'flow', showSiUnits),
       formatVal(row.velocity, 'vel', showSiUnits),
       // Angle removed
       row.coefficient.toFixed(2),
       formatVal(row.totalPressureLoss, 'press', showSiUnits)
     ];
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [33, 41, 54], halign: 'center', valign: 'middle' },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        // Angle column removed, indices shifted
        5: { cellWidth: 20 }, // Coeff
        6: { cellWidth: 25, fontStyle: 'bold' } // Loss
    },
    didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height || pageSize.getHeight();
        const pageWidth = pageSize.width || pageSize.getWidth();

        doc.setFontSize(10);
        doc.text(`System No: ${systemNo || 'N/A'}`, pageWidth - 20, 15, { align: 'right' });

        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(str, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Pressure Loss: ${formatVal(totalProjectLoss, 'press', showSiUnits)} ${showSiUnits ? 'Pa' : 'in. wg'}`, 14, finalY);

  doc.save(`duct-loss-schedule-${systemNo || 'draft'}.pdf`);
};
