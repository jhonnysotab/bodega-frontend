import * as XLSX from 'xlsx';

export interface ProductoImportRow {
  nombre: string;
  codigoBarras: string | null;
  categoriaNombre: string | null; // tal como vino del excel; se resuelve a categoriaId en el componente
  categoriaId: number | null;
  precioCompra: number | null;
  precioVenta: number | null;
  stock: number | null;
  stockMinimo: number | null;
}

// Encabezados aceptados por columna (minúsculas, sin tildes) — tolerante a variaciones comunes.
const HEADER_ALIASES: Record<string, keyof ProductoImportRow | 'categoriaNombre'> = {
  nombre: 'nombre',
  producto: 'nombre',
  'codigo de barras': 'codigoBarras',
  'codigo barras': 'codigoBarras',
  codigobarras: 'codigoBarras',
  categoria: 'categoriaNombre',
  'precio compra': 'precioCompra',
  preciocompra: 'precioCompra',
  costo: 'precioCompra',
  'precio venta': 'precioVenta',
  precioventa: 'precioVenta',
  precio: 'precioVenta',
  stock: 'stock',
  'stock actual': 'stock',
  'stock minimo': 'stockMinimo',
  'stock mínimo': 'stockMinimo',
  stockminimo: 'stockMinimo',
};

function normalizarHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita tildes
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Lee un archivo .xlsx/.xls y devuelve las filas mapeadas a ProductoImportRow. */
export function parseProductosExcel(file: File): Promise<ProductoImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length === 0) {
          resolve([]);
          return;
        }

        const headerRow: string[] = raw[0].map((h: any) => normalizarHeader(h));
        const colMap: (keyof ProductoImportRow | null)[] = headerRow.map(
          (h) => HEADER_ALIASES[h] ?? null,
        );

        const rows: ProductoImportRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const rawRow = raw[i];
          if (!rawRow || rawRow.every((c) => c === '' || c === null || c === undefined)) continue;

          const row: ProductoImportRow = {
            nombre: '',
            codigoBarras: null,
            categoriaNombre: null,
            categoriaId: null,
            precioCompra: null,
            precioVenta: null,
            stock: null,
            stockMinimo: null,
          };

          colMap.forEach((field, colIdx) => {
            if (!field) return;
            const value = rawRow[colIdx];
            if (field === 'nombre' || field === 'categoriaNombre') {
              (row as any)[field] = value ? String(value).trim() : null;
            } else if (field === 'codigoBarras') {
              row.codigoBarras = value ? String(value).trim() : null;
            } else {
              (row as any)[field] = toNumber(value);
            }
          });

          if (!row.nombre) row.nombre = '';
          rows.push(row);
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Descarga una plantilla .xlsx con las columnas esperadas y una fila de ejemplo. */
export function descargarPlantillaProductos(): void {
  const headers = [
    'Nombre',
    'Codigo de Barras',
    'Categoria',
    'Precio Compra',
    'Precio Venta',
    'Stock',
    'Stock Minimo',
  ];
  const ejemplo = ['Galleta Soda x6', '7751271001234', 'Abarrotes', 1.5, 2.5, 24, 5];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  worksheet['!cols'] = [
    { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
  XLSX.writeFile(workbook, 'plantilla_productos.xlsx');
}
