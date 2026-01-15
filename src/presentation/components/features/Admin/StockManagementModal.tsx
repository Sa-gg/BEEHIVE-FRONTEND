import React, { useState, useRef } from 'react';
import { X, Plus, Minus, Edit, AlertTriangle, Upload, Trash2, Eye } from 'lucide-react';
import { Button } from '@/presentation/components/common/ui/button';
import { Input } from '@/presentation/components/common/ui/input';
import { Label } from '@/presentation/components/common/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/common/ui/select';
import { Textarea } from '@/presentation/components/common/ui/textarea';
import { ImageViewer } from '@/presentation/components/common/ImageViewer';
import { stockTransactionApi, type StockInParams, type StockOutParams, type AdjustStockParams } from '@/infrastructure/api/stockTransaction.api';
import { uploadApi } from '@/infrastructure/api/menuItems.api';
import type { InventoryItemDTO } from '@/infrastructure/api/inventory.api';
import { formatSmartStock } from '@/shared/utils/stockFormat';
import { toast } from '@/presentation/components/common/ToastNotification';

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
  const [referenceId, setReferenceId] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${API_BASE_URL}${imagePath}`;
  };

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadApi.uploadImage(formData);
      setReceiptImage(response.data.path);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setReceiptImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadApi.uploadImage(formData);
      setReceiptImage(response.data.path);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

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
          notes: notes || undefined,
          referenceId: referenceId || undefined,
          receiptImage: receiptImage || undefined,
        };
        result = await stockTransactionApi.stockIn(params);
        
        // Show success toast for stock in
        toast.success('Stock In Recorded', `Added ${formatSmartStock(parseFloat(quantity), item.unit)} of ${item.name}`)
        
        if (result.warning) {
          setWarning(result.warning);
        }
      } else if (transactionType === 'OUT') {
        const params: StockOutParams = {
          inventoryItemId: item.id,
          quantity: parseFloat(quantity),
          reason: reason as 'ORDER' | 'WASTE' | 'ADJUSTMENT',
          notes: notes || undefined,
          referenceId: referenceId || undefined,
          receiptImage: receiptImage || undefined,
        };
        result = await stockTransactionApi.stockOut(params);
        
        // Show success toast for stock out
        toast.success('Stock Out Recorded', `Removed ${formatSmartStock(parseFloat(quantity), item.unit)} of ${item.name}`)
      } else {
        // ADJUST
        const params: AdjustStockParams = {
          inventoryItemId: item.id,
          newStock: parseFloat(newStock),
          notes: notes || undefined,
          referenceId: referenceId || undefined,
          receiptImage: receiptImage || undefined,
        };
        result = await stockTransactionApi.adjustStock(params);
        
        // Show success toast for adjustment
        toast.success('Stock Adjusted', `${item.name} stock set to ${formatSmartStock(parseFloat(newStock), item.unit)}`)
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
    setReferenceId('');
    setReceiptImage('');
    setError('');
    setWarning('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          {/* Ingredient Reconciliation Alert - Show when there's a discrepancy (negative stock) */}
          {item.status === 'DISCREPANCY' && item.currentStock < 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-purple-800">
                <AlertTriangle size={18} />
                <h4 className="font-semibold">Ingredient Reconciliation</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-purple-900">{item.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="text-purple-700">System:</span>
                    <span className="font-semibold text-red-600">{formatSmartStock(item.currentStock, item.unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Actual Count:</span>
                    <span className="font-semibold">0 {item.unit}</span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-200">
                  <span className="text-purple-700">Adjustment Needed:</span>
                  <span className="font-bold text-green-600">+{formatSmartStock(Math.abs(item.currentStock), item.unit)}</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                Use "Stock In" with reason "Reconciliation" to correct this discrepancy.
              </p>
            </div>
          )}

          {/* Item Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h3 className="font-medium text-lg">{item.name}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Stock:</span>
              <span className={`font-semibold ${item.currentStock < 0 ? 'text-red-600' : ''}`}>
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
                    : item.status === 'DISCREPANCY'
                    ? 'text-purple-600'
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
                Difference: {formatSmartStock(Math.round((parseFloat(newStock) - item.currentStock) * 100) / 100, item.unit)}
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
              rows={2}
            />
          </div>

          {/* Reference Number (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="referenceId">Reference # (Optional)</Label>
            <Input
              id="referenceId"
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g., Invoice #, PO #, Receipt #"
            />
            <p className="text-xs text-gray-500">For tracking purposes (invoice, purchase order, etc.)</p>
          </div>

          {/* Receipt Image Upload (Optional) */}
          <div className="space-y-2">
            <Label>Receipt Image (Optional)</Label>
            {receiptImage ? (
              <div className="relative border border-gray-200 rounded-lg p-2 group">
                <img
                  src={getImageUrl(receiptImage) || ''}
                  alt="Receipt"
                  className="w-full h-32 object-contain rounded cursor-pointer"
                  onClick={() => setImageViewerOpen(true)}
                />
                {/* Overlay with view icon on hover */}
                <div 
                  className="absolute inset-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center cursor-pointer"
                  onClick={() => setImageViewerOpen(true)}
                >
                  <Eye size={24} className="text-white" />
                </div>
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setImageViewerOpen(true)}
                    className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    title="View image"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">Click image to view full size</p>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : uploadingImage 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Upload size={20} className={isDragging ? 'text-blue-500' : 'text-gray-500'} />
                    </div>
                    <span className="text-sm text-gray-600">
                      {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-400">JPG, PNG, max 5MB</span>
                  </div>
                )}
              </div>
            )}
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
              disabled={loading || uploadingImage} 
              className="flex-1"
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Image Viewer Modal */}
      {imageViewerOpen && receiptImage && (
        <ImageViewer
          src={getImageUrl(receiptImage) || ''}
          alt="Receipt image"
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </div>
  );
};
