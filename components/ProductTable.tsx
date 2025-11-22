import React, { useRef } from 'react';
import { Product } from '../types';
import { Trash2, ImageOff, Camera, Upload } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onUpdatePrice: (id: string, newPrice: number) => void;
  onRemoveProduct: (id: string) => void;
  onUpdateImage: (id: string, file: File) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onUpdatePrice, onRemoveProduct, onUpdateImage }) => {
  if (products.length === 0) return null;

  const formatPYG = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white mb-20">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4 text-center w-32">Foto (Click para cambiar)</th>
              <th className="px-6 py-4">Perfume</th>
              <th className="px-6 py-4 text-right">Precio Orig.</th>
              <th className="px-6 py-4 text-right">Precio Final</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                onUpdatePrice={onUpdatePrice}
                onRemoveProduct={onRemoveProduct}
                onUpdateImage={onUpdateImage}
                formatPYG={formatPYG}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 p-3 text-center text-xs text-slate-500 border-t border-slate-200">
        Mostrando {products.length} productos
      </div>
    </div>
  );
};

// Extracted row component to manage individual file inputs cleaner
const ProductRow: React.FC<{
  product: Product;
  onUpdatePrice: (id: string, p: number) => void;
  onRemoveProduct: (id: string) => void;
  onUpdateImage: (id: string, f: File) => void;
  formatPYG: (n: number) => string;
}> = ({ product, onUpdatePrice, onRemoveProduct, onUpdateImage, formatPYG }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdateImage(product.id, file);
    }
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-6 py-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
        <div 
          onClick={handleImageClick}
          className="relative w-20 h-20 bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer group-hover:border-indigo-300 transition-all"
          title="Click para cambiar foto"
        >
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-6 h-6 text-slate-300" />
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase">Cambiar</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-3 font-medium text-slate-900 align-middle">
        {product.name}
      </td>
      <td className="px-6 py-3 text-right text-slate-500 align-middle">
        {formatPYG(product.originalPrice)}
      </td>
      <td className="px-6 py-3 text-right align-middle">
        <div className="flex justify-end items-center gap-1">
          <span className="text-slate-400 text-xs">₲</span>
          <input
            type="number"
            value={product.updatedPrice}
            onChange={(e) => onUpdatePrice(product.id, parseFloat(e.target.value))}
            className="w-28 p-1 text-right border rounded border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
            step="1000"
          />
        </div>
      </td>
      <td className="px-6 py-3 text-center align-middle">
        <button
          onClick={() => onRemoveProduct(product.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};