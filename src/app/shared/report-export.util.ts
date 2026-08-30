import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportColumn {
  header: string;
  key: string;
  /** Formatea el valor para mostrarlo en Excel/PDF. Por defecto usa el valor tal cual. */
  format?: (value: any, row: any) => string | number;
}

function buildRows(data: any[], columns: ReportColumn[]): (string | number)[][] {
  return data.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      return col.format ? col.format(raw, row) : (raw ?? '');
    }),
  );
}

export function exportToExcel(filename: string, sheetName: string, data: any[], columns: ReportColumn[]): void {
  const rows = buildRows(data, columns);
  const aoa = [columns.map((c) => c.header), ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPdf(
  filename: string,
  title: string,
  data: any[],
  columns: ReportColumn[],
  subtitle?: string,
): void {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 21);
  }

  autoTable(doc, {
    startY: subtitle ? 26 : 20,
    head: [columns.map((c) => c.header)],
    body: buildRows(data, columns),
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${filename}.pdf`);
}
