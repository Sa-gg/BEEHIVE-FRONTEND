import React, { useState } from 'react';
import { X, Plus, Minus, Edit } from 'lucide-react';
import { Button } from '@/presentation/components/common/ui/button';
import { Input } from '@/presentation/components/common/ui/input';
import { Label } from '@/presentation/components/common/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/common/ui/select';
import { Textarea } from '@/presentation/components/common/ui/textarea';
import { stockTransactionApi, type StockInParams, type StockOutParams, type AdjustStockParams } from '@/infrastructure/api/stockTransaction.api';
import type { InventoryItemDTO } from '@/infrastructure/api/inventory.api';
import { formatSmartStock } from '@/shared/utils/stockFormat';

interface StockManagementModalProps {
  item: InventoryItemDTO;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TransactionType = 'IN' | 'OUT' | 'ADJUST';

export const StockManagementModal: React.FC<StockManagementModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('IN');
  const [quantity, setQuantity] = useState<string>('');
  const [newStock, setNewStock] = useState<string>(item.currentStock.toString());
  const [reason, setReason] = useState<string>('PURCHASE');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setLoading(true);

    try {
      let result;

      if (transactionType === 'IN') {
        const params: StockInParams = {
          inventoryItemId: item.id,
          quantity: parseFloat(quantity),
          reason: reason as 'PURCHASE' | 'RECONCILIATION',
          notes,
        };
        result = await stockTransactionApi.stockIn(params);
        
        if (result.warning) {
          setWarning(result.warning);
        }
      } else if (transactionType === 'OUT') {
        const params: StockOutParams = {
          inventoryItemId: item.id,
          quantity: parseFloat(quantity),
          reason: reason as 'ORDER' | 'WASTE' | 'ADJUSTMENT',
          notes,
        };
        result = await stockTransactionApi.stockOut(params);
      } else {
        // ADJUST
        const params: AdjustStockParams = {
          inventoryItemId: item.id,
          newStock: parseFloat(newStock),
          notes,
        };
        result = await stockTransactionApi.adjustStock(params);
      }

      onSuccess();
      
      if (!warning) {
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantity('');
    setNewStock(item.currentStock.toString());
    setReason('PURCHASE');
    setNotes('');
    setError('');
    setWarning('');
  };

  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    resetForm();
    
    // Set default reason based on type
    if (type === 'IN') {
      setReason('PURCHASE');
    } else if (type === 'OUT') {
      setReason('WASTE');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white z-10">
          <h2 className="text-xl font-semibold">Stock Management</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h3 className="font-medium text-lg">{item.name}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Stock:</span>
              <span className="font-semibold">
                {formatSmartStock(item.currentStock, item.unit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span
                className={`font-semibold ${
                  item.status === 'IN_STOCK'
                    ? 'text-green-600'
                    : item.status === 'LOW_STOCK'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {item.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Transaction Type Selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={transactionType === 'IN' ? 'default' : 'outline'}
              onClick={() => handleTransactionTypeChange('IN')}
              className="flex-1"
              style={transactionType === 'IN' ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
            >
              <Plus size={16} className="mr-2" />
              Stock In
            </Button>
            <Button
              type="button"
              variant={transactionType === 'OUT' ? 'default' : 'outline'}
              onClick={() => handleTransactionTypeChange('OUT')}
              className="flex-1"
              style={transactionType === 'OUT' ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
            >
              <Minus size={16} className="mr-2" />
              Stock Out
            </Button>
            <Button
              type="button"
              variant={transactionType === 'ADJUST' ? 'default' : 'outline'}
              onClick={() => handleTransactionTypeChange('ADJUST')}
              className="flex-1"
              style={transactionType === 'ADJUST' ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
            >
              <Edit size={16} className="mr-2" />
              Adjust
            </Button>
          </div>

          {/* Transaction Type Specific Fields */}
          {transactionType === 'ADJUST' ? (
            <div className="space-y-2">
              <Label htmlFor="newStock">New Stock Level</Label>
              <Input
                id="newStock"
                type="number"
                step="0.01"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter new stock level"
                required
              />
              <p className="text-sm text-gray-500">
                Difference: {formatSmartStock(parseFloat(newStock) - item.currentStock, item.unit)}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity ({item.unit})</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Enter quantity in ${item.unit}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionType === 'IN' ? (
                      <>
                        <SelectItem value="PURCHASE">Purchase</SelectItem>
                        <SelectItem value="RECONCILIATION">Reconciliation</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="WASTE">Waste</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Warning Message */}
          {warning && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-600">{warning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="flex-1"
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
