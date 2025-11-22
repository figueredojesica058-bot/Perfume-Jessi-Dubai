import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../types';

// Access global pdfjsLib
declare const pdfjsLib: any;

/**
 * Converts all pages of a PDF file into Base64 image strings.
 */
export const convertPDFToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Scale 1.5 for decent quality/speed balance
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      // Low quality JPEG to save tokens and memory, purely for analysis
      images.push(canvas.toDataURL('image/jpeg', 0.8)); 
    }
  }

  return images;
};

/**
 * Crops a specific area from a base64 image based on normalized bounding box coordinates.
 * Box format: [ymin, xmin, ymax, xmax] (0-1 range)
 */
export const cropImageFromPage = async (base64Image: string, box: number[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = box;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const width = img.width;
      const height = img.height;

      // Calculate pixel coordinates
      const x = xmin * width;
      const y = ymin * height;
      const w = (xmax - xmin) * width;
      const h = (ymax - ymin) * height;

      canvas.width = w;
      canvas.height = h;

      if (ctx) {
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = base64Image;
  });
};

export const generateNewPDF = (products: Product[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Catálogo de Precios Actualizado', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, 14, 30);

  const formatPYG = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare body data. We pass the product object itself to access the image in didDrawCell
  const tableBody = products.map(p => [
    '', // Placeholder for Image
    p.name,
    formatPYG(p.originalPrice),
    formatPYG(p.updatedPrice)
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Foto', 'Producto', 'Precio Base', 'Precio Final']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], halign: 'center' }, 
    styles: { 
      fontSize: 10, 
      valign: 'middle', 
      minCellHeight: 25 // Ensure row is tall enough for the image
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Fixed width for image column
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 0) {
        // CRITICAL FIX: Ensure product exists before accessing properties
        const product = products[data.row.index];
        if (product && product.image) {
          try {
            // Add image to PDF cell
            // data.cell.x + padding, data.cell.y + padding, width, height
            doc.addImage(product.image, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
          } catch (e) {
            console.error('Error adding image to PDF', e);
          }
        }
      }
    }
  });

  doc.save('Catalogo_Lattafa_PYG_Fotos.pdf');
};