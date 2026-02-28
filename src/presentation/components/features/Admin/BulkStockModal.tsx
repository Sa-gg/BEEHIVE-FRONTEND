import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Upload, Trash2, Search, Package, ArrowDownToLine, ArrowUpFromLine, CheckCircle, Loader2, Eye } from 'lucide-react';
import { Button } from '@/presentation/components/common/ui/button';
import { Input } from '@/presentation/components/common/ui/input';
import { Label } from '@/presentation/components/common/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/common/ui/select';
import { Textarea } from '@/presentation/components/common/ui/textarea';
import { ImageViewer } from '@/presentation/components/common/ImageViewer';
import { stockTransactionApi, type BulkStockItem } from '@/infrastructure/api/stockTransaction.api';
import { uploadApi } from '@/infrastructure/api/menuItems.api';
import type { InventoryItemDTO } from '@/infrastructure/api/inventory.api';
import { formatSmartStock } from '@/shared/utils/stockFormat';
import { toast } from '@/presentation/components/common/ToastNotification';

interface BulkStockModalProps {
  inventoryItems: InventoryItemDTO[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TransactionType = 'IN' | 'OUT';

interface BulkItem {
  inventoryItemId: string;
  quantity: string;
  item?: InventoryItemDTO;
}

export const BulkStockModal: React.FC<BulkStockModalProps> = ({
  inventoryItems,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('IN');
  const [reason, setReason] = useState<string>('WASTE');
  const [notes, setNotes] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Items to process
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([{ inventoryItemId: '', quantity: '' }]);
  
  // Search/filter for adding items
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${API_BASE_URL}${imagePath}`;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBulkItems([{ inventoryItemId: '', quantity: '' }]);
      setTransactionType('IN');
      setReason('WASTE');
      setNotes('');
      setReferenceId('');
      setReceiptImage('');
      setSearchQuery('');
      setShowItemSelector(false);
      setActiveItemIndex(null);
    }
  }, [isOpen]);

  // Filter available items (exclude already selected ones)
  const selectedItemIds = useMemo(() => 
    new Set(bulkItems.map(b => b.inventoryItemId).filter(Boolean)),
    [bulkItems]
  );

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter(item => {
      if (selectedItemIds.has(item.id)) return false;
      if (!searchQuery) return true;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [inventoryItems, selectedItemIds, searchQuery]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File', 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadApi.uploadImage(formData);
      setReceiptImage(response.data.path);
      toast.success('Image Uploaded', 'Receipt image uploaded successfully');
    } catch (err: any) {
      toast.error('Upload Failed', err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

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
      toast.error('Invalid File', 'Please drop an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadApi.uploadImage(formData);
      setReceiptImage(response.data.path);
      toast.success('Image Uploaded', 'Receipt image uploaded successfully');
    } catch (err: any) {
      toast.error('Upload Failed', err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeReceiptImage = () => {
    setReceiptImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addItem = () => {
    setBulkItems([...bulkItems, { inventoryItemId: '', quantity: '' }]);
  };

  const removeItem = (index: number) => {
    if (bulkItems.length > 1) {
      setBulkItems(bulkItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: 'inventoryItemId' | 'quantity', value: string) => {
    const newItems = [...bulkItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If inventoryItemId changed, add the item reference
    if (field === 'inventoryItemId') {
      const item = inventoryItems.find(i => i.id === value);
      newItems[index].item = item;
    }
    
    setBulkItems(newItems);
  };

  const selectItemForIndex = (index: number, item: InventoryItemDTO) => {
    const newItems = [...bulkItems];
    newItems[index] = { 
      inventoryItemId: item.id, 
      quantity: newItems[index].quantity || '',
      item 
    };
    setBulkItems(newItems);
    setShowItemSelector(false);
    setActiveItemIndex(null);
    setSearchQuery('');
  };

  const openItemSelector = (index: number) => {
    setActiveItemIndex(index);
    setShowItemSelector(true);
    setSearchQuery('');
  };

  // Validate before submit
  const validateForm = (): boolean => {
    const validItems = bulkItems.filter(b => b.inventoryItemId && parseFloat(b.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('No Items', 'Please add at least one item with a valid quantity');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const items: BulkStockItem[] = bulkItems
        .filter(b => b.inventoryItemId && parseFloat(b.quantity) > 0)
        .map(b => ({
          inventoryItemId: b.inventoryItemId,
          quantity: parseFloat(b.quantity),
        }));

      if (transactionType === 'IN') {
        const result = await stockTransactionApi.bulkStockIn({
          items,
          referenceId: referenceId || undefined,
          receiptImage: receiptImage || undefined,
          notes: notes || undefined,
        });

        if (result.successful.length > 0) {
          toast.success(
            'Stock Added Successfully',
            `Added stock to ${result.successful.length} item${result.successful.length > 1 ? 's' : ''}`
          );
        }

        if (result.failed.length > 0) {
          toast.warning(
            'Some Items Failed',
            `${result.failed.length} item${result.failed.length > 1 ? 's' : ''} failed to update`
          );
        }
      } else {
        const result = await stockTransactionApi.bulkStockOut({
          items,
          reason: reason as 'WASTE' | 'ADJUSTMENT',
          referenceId: referenceId || undefined,
          receiptImage: receiptImage || undefined,
          notes: notes || undefined,
        });

        if (result.successful.length > 0) {
          toast.success(
            'Stock Removed Successfully',
            `Removed stock from ${result.successful.length} item${result.successful.length > 1 ? 's' : ''}`
          );
        }

        if (result.failed.length > 0) {
          toast.warning(
            'Some Items Failed',
            `${result.failed.length} item${result.failed.length > 1 ? 's' : ''} failed to update`
          );
        }

        if (result.discrepancies && result.discrepancies > 0) {
          toast.warning(
            'Stock Discrepancies',
            `${result.discrepancies} item${result.discrepancies > 1 ? 's' : ''} went into negative stock`
          );
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Operation Failed', err.message || 'Failed to process bulk stock operation');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary
  const validItemsCount = bulkItems.filter(b => b.inventoryItemId && parseFloat(b.quantity) > 0).length;
  const totalQuantity = bulkItems
    .filter(b => b.inventoryItemId && parseFloat(b.quantity) > 0)
    .reduce((sum, b) => sum + parseFloat(b.quantity || '0'), 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className={`px-6 py-4 flex items-center justify-between ${
            transactionType === 'IN' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}>
            <div className="flex items-center gap-3">
              {transactionType === 'IN' ? (
                <ArrowDownToLine className="h-6 w-6 text-white" />
              ) : (
                <ArrowUpFromLine className="h-6 w-6 text-white" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Bulk Stock {transactionType === 'IN' ? 'In' : 'Out'}
                </h2>
                <p className="text-sm text-white/80">
                  Process multiple inventory items at once
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Transaction Type Toggle */}
            <div className="flex gap-2">
              <Button
                variant={transactionType === 'IN' ? 'default' : 'outline'}
                onClick={() => setTransactionType('IN')}
                className={`flex-1 ${transactionType === 'IN' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Stock In (Purchase)
              </Button>
              <Button
                variant={transactionType === 'OUT' ? 'default' : 'outline'}
                onClick={() => setTransactionType('OUT')}
                className={`flex-1 ${transactionType === 'OUT' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Stock Out
              </Button>
            </div>

            {/* Reason (for OUT only) */}
            {transactionType === 'OUT' && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WASTE">Waste / Spoilage</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Row
                </Button>
              </div>

              {/* Items Table Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                <div className="col-span-6">Item</div>
                <div className="col-span-2">Current</div>
                <div className="col-span-3">Quantity</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items Rows */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {bulkItems.map((bulkItem, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2"
                  >
                    {/* Item Selector */}
                    <div className="col-span-6">
                      {bulkItem.item ? (
                        <div 
                          className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg cursor-pointer hover:border-gray-400"
                          onClick={() => openItemSelector(index)}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            bulkItem.item.status === 'OUT_OF_STOCK' ? 'bg-red-500' :
                            bulkItem.item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 
                            bulkItem.item.status === 'DISCREPANCY' ? 'bg-purple-500' : 'bg-green-500'
                          }`} />
                          <span className="text-sm truncate flex-1">{bulkItem.item.name}</span>
                          <span className="text-xs text-gray-400">{bulkItem.item.unit}</span>
                        </div>
                      ) : (
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-gray-500 bg-white border border-dashed rounded-lg hover:border-gray-400 hover:bg-gray-50"
                          onClick={() => openItemSelector(index)}
                        >
                          <Search className="h-3 w-3 inline mr-2" />
                          Select item...
                        </button>
                      )}
                    </div>

                    {/* Current Stock */}
                    <div className="col-span-2">
                      {bulkItem.item ? (
                        <span className={`text-sm font-medium ${
                          bulkItem.item.currentStock < 0 ? 'text-purple-600' :
                          bulkItem.item.currentStock === 0 ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {formatSmartStock(bulkItem.item.currentStock, bulkItem.item.unit)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Qty"
                        value={bulkItem.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeItem(index)}
                        disabled={bulkItems.length === 1}
                        className={`p-1.5 rounded-lg transition-colors ${
                          bulkItems.length === 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Item Selector Dropdown */}
              {showItemSelector && activeItemIndex !== null && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-[5]" 
                    onClick={() => {
                      setShowItemSelector(false);
                      setActiveItemIndex(null);
                    }}
                  />
                  <div className="absolute left-0 right-0 top-[60px] bg-white border rounded-xl shadow-xl z-10 max-h-[300px] overflow-hidden max-w-md mx-auto">
                  <div className="p-3 border-b sticky top-0 bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search inventory items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[240px]">
                    {filteredInventoryItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No items found
                      </div>
                    ) : (
                      filteredInventoryItems.map(item => (
                        <button
                          key={item.id}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-left border-b last:border-0"
                          onClick={() => selectItemForIndex(activeItemIndex, item)}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            item.status === 'OUT_OF_STOCK' ? 'bg-red-500' :
                            item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 
                            item.status === 'DISCREPANCY' ? 'bg-purple-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.category}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-medium ${
                              item.currentStock < 0 ? 'text-purple-600' :
                              item.currentStock === 0 ? 'text-red-600' : 'text-gray-700'
                            }`}>
                              {formatSmartStock(item.currentStock, item.unit)}
                            </p>
                            <p className="text-xs text-gray-400">{item.unit}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t bg-gray-50">
                    <button
                      className="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      onClick={() => {
                        setShowItemSelector(false);
                        setActiveItemIndex(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                </>
              )}
            </div>

            {/* Summary */}
            <div className={`p-4 rounded-xl ${
              transactionType === 'IN' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className={`h-5 w-5 ${transactionType === 'IN' ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-medium">Summary</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {validItemsCount} item{validItemsCount !== 1 ? 's' : ''} selected
                  </p>
                  <p className={`text-lg font-bold ${transactionType === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                    {transactionType === 'IN' ? '+' : '-'}{totalQuantity.toFixed(2)} total units
                  </p>
                </div>
              </div>
            </div>

            {/* Reference & Receipt Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reference ID */}
              <div className="space-y-2">
                <Label>Reference ID (Optional)</Label>
                <Input
                  placeholder="e.g., Receipt #, PO #, Invoice #"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                />
              </div>

              {/* Receipt Image */}
              <div className="space-y-2">
                <Label>Receipt Image (Optional)</Label>
                {receiptImage ? (
                  <div className="relative group">
                    <img
                      src={getImageUrl(receiptImage) || ''}
                      alt="Receipt"
                      className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                      onClick={() => setImageViewerOpen(true)}
                    />
                    {/* Overlay with view icon on hover */}
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                      onClick={() => setImageViewerOpen(true)}
                    >
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        onClick={() => setImageViewerOpen(true)}
                        className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                        title="View image"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={removeReceiptImage}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragging ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 mx-auto animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">
                          Click or drag image
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || validItemsCount === 0}
              className={transactionType === 'IN' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {transactionType === 'IN' ? 'Add Stock' : 'Remove Stock'} ({validItemsCount} items)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Image Viewer Modal */}
      {imageViewerOpen && receiptImage && (
        <ImageViewer
          src={getImageUrl(receiptImage) || ''}
          alt="Receipt image"
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </>
  );
};
