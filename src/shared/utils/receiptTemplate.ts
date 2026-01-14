/**
 * Unified Receipt Template for 58mm Thermal Paper
 * Compact design with Arial font to save paper
 */

export interface ReceiptItemAddon {
  addonName: string
  quantity: number
  addonPrice: number
  subtotal: number
}

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  subtotal?: number
  status?: 'PREPARING' | 'COMPLETED' | 'VOIDED'
  // NEW: Variant and add-ons support
  variantName?: string
  variantPriceDelta?: number
  addons?: ReceiptItemAddon[]
  notes?: string
}

export interface ReceiptData {
  orderNumber: string
  createdAt?: string | Date
  customerName?: string
  tableNumber?: string
  orderType?: string
  paymentMethod?: string
  paymentStatus?: string
  items: ReceiptItem[]
  subtotal?: number
  tax?: number
  totalAmount: number
  deliveryFee?: number
  serviceFee?: number
  discountAmount?: number
  cashReceived?: number
  changeAmount?: number
  notes?: string
  processedBy?: string
  createdBy?: string
}

export interface MergedReceiptData {
  orderNumbers: string[]
  customerName?: string
  tableNumber?: string
  orderType?: string
  paymentMethod?: string
  items: ReceiptItem[]
  subtotal?: number
  tax?: number
  totalAmount: number
}

export interface LinkedOrdersReceiptData {
  parentOrder: {
    orderNumber: string
    customerName?: string
    tableNumber?: string
  }
  orders: Array<{
    orderNumber: string
    items: ReceiptItem[]
    totalAmount: number
  }>
  combinedSubtotal: number
  combinedTax: number
  combinedTotal: number
}

// 48mm printable width for POS58 thermal printer
const PAPER_WIDTH = '48mm'

/**
 * Compact CSS styles for 58mm thermal receipt - Arial font, minimal line height
 */
const getBaseStyles = () => `
  @media print {
    @page {
      size: ${PAPER_WIDTH} auto;
      margin: 0 !important;
      padding: 0 !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 1mm !important;
      background: white !important;
    }
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background: transparent !important;
  }
  html, body {
    font-family: Arial, Helvetica, sans-serif;
    width: ${PAPER_WIDTH};
    max-width: ${PAPER_WIDTH};
    margin: 0;
    padding: 1mm;
    font-size: 10px;
    line-height: 1.1;
    background: white !important;
    color: #000;
  }
  .header {
    text-align: center;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 2px dashed #000;
  }
  .logo {
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .tagline {
    font-size: 10px;
    font-weight: bold;
    margin-top: 3px;
  }
  .divider {
    border-top: 2px dashed #000;
    margin: 8px 0;
  }
  .divider-solid {
    border-top: 2px solid #000;
    margin: 8px 0;
  }
  .info-section {
    margin: 8px 0;
    font-size: 12px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
    font-weight: bold;
  }
  .info-label {
    font-weight: bold;
  }
  .info-value {
    font-weight: bold;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  .items-section {
    margin: 10px 0;
    padding: 8px 0;
    border-top: 2px dashed #000;
    border-bottom: 2px dashed #000;
  }
  .items-header {
    display: flex;
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #000;
  }
  .item-row {
    display: flex;
    font-size: 12px;
    font-weight: bold;
    margin: 4px 0;
  }
  .item-name {
    flex: 1;
    word-break: break-word;
    padding-right: 4px;
    font-weight: bold;
  }
  .item-variant {
    font-size: 10px;
    font-weight: normal;
    color: #333;
    margin-left: 8px;
  }
  .item-addon {
    display: flex;
    font-size: 10px;
    font-weight: normal;
    margin: 2px 0 2px 8px;
    color: #333;
  }
  .item-addon-name {
    flex: 1;
    padding-right: 4px;
  }
  .item-addon-price {
    width: 55px;
    text-align: right;
  }
  .item-notes {
    font-size: 9px;
    font-style: italic;
    margin: 2px 0 2px 8px;
    color: #555;
  }
  .item-qty {
    width: 28px;
    text-align: center;
    font-weight: bold;
  }
  .item-price {
    width: 55px;
    text-align: right;
    font-weight: bold;
  }
  .totals-section {
    margin: 8px 0;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    font-size: 12px;
    font-weight: bold;
  }
  .total-row.subtotal {
    padding-top: 6px;
  }
  .total-row.grand {
    font-size: 16px;
    font-weight: bold;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 2px solid #000;
  }
  .footer {
    text-align: center;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 2px dashed #000;
    font-size: 12px;
    font-weight: bold;
  }
  .footer-thanks {
    font-weight: bold;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .footer-social {
    margin-top: 8px;
    font-size: 11px;
    font-weight: bold;
  }
  .footer-printed {
    display: none;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: bold;
    border-radius: 2px;
    border: 2px solid #000;
  }
  .badge-paid {
    background: transparent !important;
  }
  .badge-pending {
    background: transparent !important;
  }
  .merged-notice {
    background: transparent !important;
    padding: 6px;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    margin: 8px 0;
    border: 2px dashed #000;
  }
  .order-section {
    border-bottom: 2px dashed #000;
    padding: 8px 0;
    margin-bottom: 8px;
  }
  .order-title {
    font-weight: bold;
    font-size: 12px;
    margin-bottom: 6px;
  }
`

/**
 * Format order number for display
 * Handles both numeric and string formats like "ORD-20251214-1"
 */
export const formatOrderNumber = (orderNumber: number | string): string => {
  if (!orderNumber) return '#0000'
  
  // If it's a string in format "ORD-YYYYMMDD-N", extract the sequence number
  if (typeof orderNumber === 'string') {
    // Try to match "ORD-YYYYMMDD-N" format
    const match = orderNumber.match(/ORD-\d{8}-(\d+)/)
    if (match) {
      return `#${String(parseInt(match[1])).padStart(4, '0')}`
    }
    // If it's already just a number string, format it
    const parsed = parseInt(orderNumber)
    if (!isNaN(parsed)) {
      return `#${String(parsed).padStart(4, '0')}`
    }
    // Otherwise return the original string with # prefix
    return `#${orderNumber}`
  }
  
  // If it's a number, format directly
  return `#${String(orderNumber).padStart(4, '0')}`
}

/**
 * Format currency for receipt
 */
const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`
}

/**
 * Get order type display text
 */
const getOrderTypeDisplay = (orderType?: string): string => {
  switch (orderType) {
    case 'DINE_IN': return 'Dine In'
    case 'TAKEOUT': return 'Takeout'
    case 'DELIVERY': return 'Delivery'
    default: return orderType || 'N/A'
  }
}

/**
 * Filter out voided items from the list
 */
const filterNonVoidedItems = (items: ReceiptItem[]): ReceiptItem[] => {
  return items.filter(item => item.status !== 'VOIDED')
}

/**
 * Generate standard receipt HTML for single order
 */
export const generateReceiptHTML = (data: ReceiptData): string => {
  const createdDate = data.createdAt ? new Date(data.createdAt) : new Date()
  // Filter out voided items
  const activeItems = filterNonVoidedItems(data.items)
  // Calculate items total first (before fees/discount)
  const itemsTotal = activeItems.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0)
  // Auto-calculate VAT (12% inclusive) from items total
  const tax = data.tax ?? (itemsTotal * (12 / 112))
  const subtotal = data.subtotal ?? (itemsTotal - tax)
  // Get fees and discount
  const deliveryFee = data.deliveryFee || 0
  const serviceFee = data.serviceFee || 0
  const discountAmount = data.discountAmount || 0
  // Final total = items + fees - discount
  const finalTotal = data.totalAmount || (itemsTotal + deliveryFee + serviceFee - discountAmount)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${formatOrderNumber(data.orderNumber)}</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🐝 BEEHIVE</div>
        <div class="tagline">Cafe & Restaurant</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Order:</span>
          <span class="info-value">${formatOrderNumber(data.orderNumber)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${createdDate.toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${createdDate.toLocaleTimeString()}</span>
        </div>
        ${data.customerName ? `
        <div class="info-row">
          <span class="info-label">Customer:</span>
          <span class="info-value">${data.customerName}</span>
        </div>` : ''}
        ${data.tableNumber ? `
        <div class="info-row">
          <span class="info-label">Table:</span>
          <span class="info-value">${data.tableNumber}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="info-label">Type:</span>
          <span class="info-value">${getOrderTypeDisplay(data.orderType)}</span>
        </div>
        ${data.paymentMethod ? `
        <div class="info-row">
          <span class="info-label">Payment:</span>
          <span class="info-value">${data.paymentMethod}</span>
        </div>` : ''}
        ${data.paymentStatus ? `
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">
            <span class="badge ${data.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${data.paymentStatus}</span>
          </span>
        </div>` : ''}
      </div>

      <div class="items-section">
        <div class="items-header">
          <span class="item-name">Item</span>
          <span class="item-qty">Qty</span>
          <span class="item-price">Amount</span>
        </div>
        ${activeItems.map(item => `
          <div class="item-row">
            <span class="item-name">
              ${item.name}${item.variantName ? `<span class="item-variant">(${item.variantName})</span>` : ''}
            </span>
            <span class="item-qty">${item.quantity}</span>
            <span class="item-price">${formatCurrency(item.subtotal || (item.price * item.quantity))}</span>
          </div>
          ${item.addons && item.addons.length > 0 ? item.addons.map(addon => `
            <div class="item-addon">
              <span class="item-addon-name">+ ${addon.addonName}${addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</span>
              <span class="item-addon-price">${formatCurrency(addon.subtotal)}</span>
            </div>
          `).join('') : ''}
          ${item.notes ? `<div class="item-notes">Note: ${item.notes}</div>` : ''}
        `).join('')}
      </div>

      <div class="totals-section">
        <div class="total-row subtotal">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span>VAT (12%):</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        ${deliveryFee > 0 ? `
        <div class="total-row">
          <span>Delivery Fee:</span>
          <span>${formatCurrency(deliveryFee)}</span>
        </div>` : ''}
        ${serviceFee > 0 ? `
        <div class="total-row">
          <span>Service Fee:</span>
          <span>${formatCurrency(serviceFee)}</span>
        </div>` : ''}
        ${discountAmount > 0 ? `
        <div class="total-row">
          <span>Discount:</span>
          <span>-${formatCurrency(discountAmount)}</span>
        </div>` : ''}
        <div class="total-row grand">
          <span>TOTAL:</span>
          <span>${formatCurrency(finalTotal)}</span>
        </div>
        ${data.cashReceived && data.cashReceived > 0 ? `
        <div class="total-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000;">
          <span>Cash:</span>
          <span>${formatCurrency(data.cashReceived)}</span>
        </div>
        <div class="total-row">
          <span>Change:</span>
          <span>${formatCurrency(data.changeAmount || 0)}</span>
        </div>` : ''}
      </div>

      <div class="footer">
        <div class="footer-thanks">Thank you for dining with us!</div>
        <div>Please come again!</div>
        <div class="footer-social">FB: BEEHIVECAFEANDRESTO</div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate merged receipt HTML for multiple orders
 */
export const generateMergedReceiptHTML = (data: MergedReceiptData): string => {
  // Filter out voided items
  const activeItems = filterNonVoidedItems(data.items)
  // Auto-calculate VAT (12% inclusive) if not provided
  const tax = data.tax ?? (data.totalAmount * (12 / 112))
  const subtotal = data.subtotal ?? (data.totalAmount - tax)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Merged Receipt</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🐝 BEEHIVE</div>
        <div class="tagline">Cafe & Restaurant</div>
      </div>

      <div class="merged-notice">
        <strong>MERGED RECEIPT</strong><br/>
        Orders: ${data.orderNumbers.map(n => formatOrderNumber(n)).join(' + ')}
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${new Date().toLocaleString()}</span>
        </div>
        ${data.customerName ? `
        <div class="info-row">
          <span class="info-label">Customer:</span>
          <span class="info-value">${data.customerName}</span>
        </div>` : ''}
        ${data.tableNumber ? `
        <div class="info-row">
          <span class="info-label">Table:</span>
          <span class="info-value">${data.tableNumber}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="info-label">Type:</span>
          <span class="info-value">${getOrderTypeDisplay(data.orderType)}</span>
        </div>
        ${data.paymentMethod ? `
        <div class="info-row">
          <span class="info-label">Payment:</span>
          <span class="info-value">${data.paymentMethod}</span>
        </div>` : ''}
      </div>

      <div class="items-section">
        <div class="items-header">
          <span class="item-name">Item</span>
          <span class="item-qty">Qty</span>
          <span class="item-price">Amount</span>
        </div>
        ${activeItems.map(item => `
          <div class="item-row">
            <span class="item-name">${item.name}</span>
            <span class="item-qty">${item.quantity}</span>
            <span class="item-price">${formatCurrency(item.subtotal || (item.price * item.quantity))}</span>
          </div>
        `).join('')}
      </div>

      <div class="totals-section">
        <div class="total-row subtotal">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span>VAT (12%):</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        <div class="total-row grand">
          <span>TOTAL:</span>
          <span>${formatCurrency(data.totalAmount)}</span>
        </div>
      </div>

      <div class="footer">
        <div class="footer-thanks">Thank you for dining with us!</div>
        <div>Please come again!</div>
        <div class="footer-social">FB: BEEHIVECAFEANDRESTO</div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate combined receipt HTML for linked orders
 */
export const generateLinkedOrdersReceiptHTML = (data: LinkedOrdersReceiptData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Combined Receipt</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🐝 BEEHIVE</div>
        <div class="tagline">Cafe & Restaurant</div>
        <div style="margin-top: 4px; font-size: 10px; font-weight: bold;">COMBINED BILL</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Customer:</span>
          <span class="info-value">${data.parentOrder.customerName || 'Guest'}</span>
        </div>
        ${data.parentOrder.tableNumber ? `
        <div class="info-row">
          <span class="info-label">Table:</span>
          <span class="info-value">${data.parentOrder.tableNumber}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${new Date().toLocaleDateString()}</span>
        </div>
      </div>

      ${data.orders.map((order, idx) => {
        const activeOrderItems = filterNonVoidedItems(order.items)
        return `
        <div class="order-section">
          <div class="order-title">Order ${idx + 1}: ${formatOrderNumber(order.orderNumber)}</div>
          ${activeOrderItems.map(item => `
            <div class="item-row">
              <span class="item-name">${item.name} x${item.quantity}</span>
              <span class="item-price">${formatCurrency(item.subtotal || (item.price * item.quantity))}</span>
            </div>
          `).join('')}
          <div class="total-row" style="font-size: 10px; margin-top: 4px;">
            <span>Order Total:</span>
            <span>${formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      `}).join('')}

      <div class="totals-section">
        <div class="total-row subtotal">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.combinedSubtotal)}</span>
        </div>
        <div class="total-row">
          <span>VAT (12% incl):</span>
          <span>${formatCurrency(data.combinedTax)}</span>
        </div>
        <div class="total-row grand">
          <span>GRAND TOTAL:</span>
          <span>${formatCurrency(data.combinedTotal)}</span>
        </div>
      </div>

      <div class="footer">
        <div class="footer-thanks">Thank you for dining with us!</div>
        <div>Please come again!</div>
        <div class="footer-social">FB: BEEHIVECAFEANDRESTO</div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate kitchen copy receipt (simplified version for kitchen)
 */
export const generateKitchenReceiptHTML = (data: ReceiptData): string => {
  const createdDate = data.createdAt ? new Date(data.createdAt) : new Date()
  // Filter out voided items
  const activeItems = filterNonVoidedItems(data.items)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Kitchen Copy</title>
      <style>
        ${getBaseStyles()}
        .kitchen-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          padding: 6px;
          border: 2px solid #000;
          margin-bottom: 10px;
        }
        .kitchen-item {
          font-size: 14px;
          font-weight: bold;
          margin: 6px 0;
          padding: 4px 0;
          border-bottom: 1px dashed #000;
        }
        .kitchen-variant {
          font-size: 12px;
          font-weight: normal;
          margin-left: 4px;
        }
        .kitchen-addon {
          font-size: 12px;
          font-weight: normal;
          margin: 2px 0 2px 20px;
          color: #333;
        }
        .kitchen-notes {
          font-size: 11px;
          font-style: italic;
          margin: 4px 0 4px 20px;
          padding: 4px;
          background: #f0f0f0;
          border-left: 3px solid #000;
        }
      </style>
    </head>
    <body>
      <div class="kitchen-title">KITCHEN COPY</div>
      
      <div class="info-section">
        <div class="info-row">
          <span>Order:</span>
          <span style="font-size: 16px;">${formatOrderNumber(data.orderNumber)}</span>
        </div>
        <div class="info-row">
          <span>Time:</span>
          <span>${createdDate.toLocaleTimeString()}</span>
        </div>
        ${data.tableNumber ? `
        <div class="info-row">
          <span>Table:</span>
          <span style="font-size: 16px;">${data.tableNumber}</span>
        </div>` : ''}
        <div class="info-row">
          <span>Type:</span>
          <span style="font-size: 14px;">${getOrderTypeDisplay(data.orderType)}</span>
        </div>
        ${data.customerName ? `
        <div class="info-row">
          <span>Customer:</span>
          <span>${data.customerName}</span>
        </div>` : ''}
      </div>

      <div class="divider"></div>

      <div style="margin: 10px 0;">
        ${activeItems.map(item => `
          <div class="kitchen-item">
            <span style="font-size: 16px;">${item.quantity}x</span> ${item.name}${item.variantName ? `<span class="kitchen-variant">(${item.variantName})</span>` : ''}
          </div>
          ${item.addons && item.addons.length > 0 ? item.addons.map(addon => `
            <div class="kitchen-addon">+ ${addon.addonName}${addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</div>
          `).join('') : ''}
          ${item.notes ? `<div class="kitchen-notes">📝 ${item.notes}</div>` : ''}
        `).join('')}
      </div>
    </body>
    </html>
  `
}
