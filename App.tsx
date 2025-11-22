import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductTable } from './components/ProductTable';
import { BulkActions } from './components/BulkActions';
import { Product, BulkActionType, ProcessingStatus } from './types';
import { convertPDFToImages, cropImageFromPage, generateNewPDF } from './services/pdfService';
import { parsePageWithGemini } from './services/geminiService';
import { UploadCloud, FileText, Download, Loader2, AlertCircle, Image as ImageIcon, Trash2, Save } from 'lucide-react';

// Helper to standardize uploaded images to 300x300 squares
const resizeAndSquareImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Standard size
        const size = 300;
        canvas.width = size;
        canvas.height = size;

        // Calculate center crop
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (sWidth > sHeight) {
          sWidth = sHeight;
          sx = (img.width - sHeight) / 2;
        } else {
          sHeight = sWidth;
          sy = (img.height - sWidth) / 2;
        }

        if (ctx) {
          // Fill white background just in case transparent png
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          
          // Draw cropped image
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      } else {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle', message: '' });
  const [fileName, setFileName] = useState<string>('');

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('perfume-products');
    const savedFile = localStorage.getItem('perfume-filename');
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
        if (savedFile) setFileName(savedFile);
      } catch (e) {
        console.error("Error loading saved data", e);
      }
    }
  }, []);

  // Save to LocalStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('perfume-products', JSON.stringify(products));
      localStorage.setItem('perfume-filename', fileName);
    }
  }, [products, fileName]);

  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de querer borrar toda la lista guardada?')) {
      setProducts([]);
      setFileName('');
      localStorage.removeItem('perfume-products');
      localStorage.removeItem('perfume-filename');
      setStatus({ step: 'idle', message: '' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    // Do not clear products, append instead
    setStatus({ step: 'reading', message: 'Convirtiendo PDF a imágenes...' });

    try {
      // 1. Convert PDF pages to Images
      const pageImages = await convertPDFToImages(file);
      
      setStatus({ 
        step: 'analyzing', 
        message: `Analizando página 1 de ${pageImages.length}...`,
        progress: 1,
        total: pageImages.length
      });

      // 2. Process each page
      for (let i = 0; i < pageImages.length; i++) {
        const pageImage = pageImages[i];
        
        setStatus({ 
          step: 'analyzing', 
          message: `Escaneando página ${i + 1}/${pageImages.length}...`,
          progress: i + 1,
          total: pageImages.length
        });

        // Send page image to Gemini
        const geminiItems = await parsePageWithGemini(pageImage);

        // Process items and crop images
        const pageProducts: Product[] = [];
        for (const item of geminiItems) {
          let croppedImage = '';
          if (item.boundingBox && item.boundingBox.length === 4) {
            croppedImage = await cropImageFromPage(pageImage, item.boundingBox);
          }

          pageProducts.push({
            id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || 'Producto sin nombre',
            originalPrice: item.originalPrice || 0,
            updatedPrice: item.originalPrice || 0,
            image: croppedImage
          });
        }

        // Update state progressively so user sees items appearing
        setProducts(prev => [...prev, ...pageProducts]);
      }

      setStatus({ step: 'complete', message: `Proceso finalizado.` });

    } catch (error) {
      setStatus({ step: 'error', message: 'Error al procesar. Verifica tu API Key o si el PDF es válido.' });
      console.error(error);
    }
  };

  const handleBulkUpdate = (type: BulkActionType, value: number) => {
    setProducts(prev => prev.map(p => {
      let newPrice = p.updatedPrice;
      
      switch (type) {
        case BulkActionType.ADD:
          newPrice = p.updatedPrice + value;
          break;
        case BulkActionType.SUBTRACT:
          newPrice = Math.max(0, p.updatedPrice - value);
          break;
        case BulkActionType.PERCENTAGE:
          newPrice = p.updatedPrice * (1 + (value / 100));
          break;
      }
      
      return { ...p, updatedPrice: Math.round(newPrice) };
    }));
  };

  const handleIndividualUpdate = (id: string, newPrice: number) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, updatedPrice: newPrice } : p
    ));
  };

  const handleImageUpdate = async (id: string, file: File) => {
    try {
      const standardizedImage = await resizeAndSquareImage(file);
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, image: standardizedImage } : p
      ));
    } catch (error) {
      console.error("Error updating image", error);
      alert("No se pudo actualizar la imagen.");
    }
  };

  const handleRemove = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleDownload = () => {
    generateNewPDF(products);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Upload Section */}
        {(products.length === 0 && status.step !== 'analyzing') && (
          <div className="max-w-xl mx-auto mt-10 bg-white p-10 rounded-2xl shadow-lg border border-dashed border-slate-300 text-center">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <UploadCloud className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Cargar Catálogo PDF</h2>
            <p className="text-slate-500 mb-8">Sube tu lista de precios (Lattafa) para extraer productos y fotos.</p>
            
            <label className="inline-flex group">
              <span className="bg-indigo-600 group-hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg cursor-pointer transition-all shadow-md flex items-center gap-2 transform group-hover:scale-105">
                <FileText className="w-5 h-5" />
                Seleccionar PDF
              </span>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            {status.step === 'error' && (
               <div className="mt-6 text-red-500 flex items-center justify-center gap-2 bg-red-50 p-3 rounded-lg">
                 <AlertCircle className="w-5 h-5" />
                 <span className="text-sm font-medium">{status.message}</span>
               </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {(status.step === 'reading' || status.step === 'analyzing') && (
           <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center mb-10">
             <div className="flex justify-center mb-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800">{status.message}</h3>
             {status.total && (
               <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden">
                 <div 
                   className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                   style={{ width: `${(status.progress! / status.total) * 100}%` }}
                 ></div>
               </div>
             )}
             <p className="text-sm text-slate-400 mt-2">Esto puede tomar unos segundos por página...</p>
           </div>
        )}

        {/* Editor Section */}
        {products.length > 0 && (
          <div className="animate-fade-in-up">
            
            <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                 <h2 className="text-xl font-bold flex items-center gap-2">
                   <ImageIcon className="w-6 h-6 text-indigo-300" />
                   Editor de Catálogo
                 </h2>
                 <p className="text-indigo-200 text-sm mt-1">
                   {products.length} productos cargados. Tus cambios se guardan automáticamente.
                 </p>
              </div>
              
              <div className="flex gap-3">
                 <label className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border border-indigo-500">
                    <UploadCloud className="w-4 h-4" />
                    <span>Agregar más páginas</span>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                 </label>

                 <button 
                    onClick={handleClearAll}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-red-500/30"
                 >
                    <Trash2 className="w-4 h-4" />
                    Borrar Todo
                 </button>
                 
                 <button
                   onClick={handleDownload}
                   className="bg-white text-indigo-900 hover:bg-indigo-50 px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                   disabled={status.step === 'analyzing'}
                 >
                   <Download className="w-5 h-5" />
                   {status.step === 'analyzing' ? 'Procesando...' : 'Descargar PDF'}
                 </button>
              </div>
            </div>

            <BulkActions onApply={handleBulkUpdate} disabled={status.step === 'analyzing'} />
            
            <ProductTable 
              products={products} 
              onUpdatePrice={handleIndividualUpdate} 
              onRemoveProduct={handleRemove}
              onUpdateImage={handleImageUpdate}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;