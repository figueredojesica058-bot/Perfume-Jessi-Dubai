import React, { useState } from 'react';
import { BulkActionType } from '../types';
import { Calculator, Plus, Minus, Percent } from 'lucide-react';

interface BulkActionsProps {
  onApply: (type: BulkActionType, value: number) => void;
  disabled: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({ onApply, disabled }) => {
  const [value, setValue] = useState<string>('');

  const handleAction = (type: BulkActionType) => {
    const numVal = parseFloat(value);
    if (!isNaN(numVal) && numVal >= 0) {
      onApply(type, numVal);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex items-center gap-2 mb-4 text-slate-700">
        <Calculator className="w-5 h-5" />
        <h2 className="font-semibold">Operaciones Masivas</h2>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="w-full md:w-auto flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Monto / Porcentaje</label>
          <input
            type="number"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <button
            onClick={() => handleAction(BulkActionType.ADD)}
            disabled={disabled || !value}
            className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold">Sumar</span>
          </button>

          <button
            onClick={() => handleAction(BulkActionType.SUBTRACT)}
            disabled={disabled || !value}
            className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors"
          >
            <Minus className="w-5 h-5" />
            <span className="text-xs font-bold">Restar</span>
          </button>

          <button
            onClick={() => handleAction(BulkActionType.PERCENTAGE)}
            disabled={disabled || !value}
            className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <Percent className="w-5 h-5" />
            <span className="text-xs font-bold">Aplicar %</span>
          </button>
        </div>
      </div>
    </div>
  );
};