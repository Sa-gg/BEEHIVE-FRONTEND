import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../common/ui/dialog'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { 
  User, 
  Phone, 
  CreditCard, 
  Star, 
  Gift, 
  Loader2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { loyaltyApi, type CustomerLoyaltyDTO, STAMPS_FOR_REWARD } from '../../../../infrastructure/api/loyalty.api'

export type LoyaltyType = 'guest' | 'phone' | 'card'

export interface LoyaltySelection {
  type: LoyaltyType
  customerPhone?: string
  cardCode?: string
  customerName?: string
  loyaltyCustomer?: CustomerLoyaltyDTO | null
}

interface LoyaltySelectModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (selection: LoyaltySelection) => void
  currentCustomerName?: string
}

export const LoyaltySelectModal = ({ 
  open, 
  onClose, 
  onConfirm,
  currentCustomerName 
}: LoyaltySelectModalProps) => {
  const [loyaltyType, setLoyaltyType] = useState<LoyaltyType>('guest')
  const [customerPhone, setCustomerPhone] = useState('')
  const [cardCode, setCardCode] = useState('')
  const [customerName, setCustomerName] = useState(currentCustomerName || '')
  const [loading, setLoading] = useState(false)
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<CustomerLoyaltyDTO | null>(null)
  const [error, setError] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLoyaltyType('guest')
      setCustomerPhone('')
      setCardCode('')
      setCustomerName(currentCustomerName || '')
      setLoyaltyCustomer(null)
      setError('')
    }
  }, [open, currentCustomerName])

  // Look up loyalty customer when phone or card is entered
  const handleLookup = async () => {
    setError('')
    setLoyaltyCustomer(null)
    setLoading(true)

    try {
      let result: { success: boolean; found: boolean; customer: CustomerLoyaltyDTO | null }

      if (loyaltyType === 'phone' && customerPhone) {
        result = await loyaltyApi.lookup({ customerPhone })
      } else if (loyaltyType === 'card' && cardCode) {
        result = await loyaltyApi.lookupByCard(cardCode)
      } else {
        setLoading(false)
        return
      }

      if (result.found && result.customer) {
        setLoyaltyCustomer(result.customer)
        // Auto-fill name from loyalty record if not already set
        if (result.customer.customerName && !customerName) {
          setCustomerName(result.customer.customerName)
        }
      } else {
        setError('No loyalty account found. A new account will be created.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to look up loyalty account')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onConfirm({
      type: loyaltyType,
      customerPhone: loyaltyType === 'phone' ? customerPhone : undefined,
      cardCode: loyaltyType === 'card' ? cardCode.toUpperCase() : undefined,
      customerName: customerName || undefined,
      loyaltyCustomer
    })
  }

  const isValid = () => {
    if (loyaltyType === 'guest') return true
    if (loyaltyType === 'phone') return customerPhone.length >= 10
    if (loyaltyType === 'card') return cardCode.length >= 4
    return false
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Loyalty Selection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Loyalty Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setLoyaltyType('guest')
                setLoyaltyCustomer(null)
                setError('')
              }}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                loyaltyType === 'guest'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Guest</span>
            </button>
            <button
              onClick={() => {
                setLoyaltyType('phone')
                setLoyaltyCustomer(null)
                setError('')
              }}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                loyaltyType === 'phone'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs font-medium">Phone</span>
            </button>
            <button
              onClick={() => {
                setLoyaltyType('card')
                setLoyaltyCustomer(null)
                setError('')
              }}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                loyaltyType === 'card'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs font-medium">Card</span>
            </button>
          </div>

          {/* Guest Mode Info */}
          {loyaltyType === 'guest' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                No loyalty tracking for this order. Customer will not earn a stamp.
              </p>
            </div>
          )}

          {/* Phone Input */}
          {loyaltyType === 'phone' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="09171234567"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value)
                      setLoyaltyCustomer(null)
                      setError('')
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={customerPhone.length < 10 || loading}
                    variant="outline"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Card Input */}
          {loyaltyType === 'card' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cardCode">Card Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="cardCode"
                    placeholder="BEEHIVE-001"
                    value={cardCode}
                    onChange={(e) => {
                      setCardCode(e.target.value.toUpperCase())
                      setLoyaltyCustomer(null)
                      setError('')
                    }}
                    className="flex-1 font-mono"
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={cardCode.length < 4 || loading}
                    variant="outline"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Customer Name (optional) */}
          {loyaltyType !== 'guest' && (
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name (Optional)</Label>
              <Input
                id="name"
                placeholder="Juan Dela Cruz"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          )}

          {/* Loyalty Status Display */}
          {loyaltyCustomer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {loyaltyCustomer.customerName || 'Customer Found'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-gray-700">
                    <strong>{loyaltyCustomer.currentStamps}</strong>/{STAMPS_FOR_REWARD} stamps
                  </span>
                </div>
                {loyaltyCustomer.availableRewards > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 font-medium">
                      {loyaltyCustomer.availableRewards} free drink{loyaltyCustomer.availableRewards > 1 ? 's' : ''}!
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                +1 stamp will be awarded when order is paid
              </p>
            </div>
          )}

          {/* Error/Info */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid()}
            style={{ backgroundColor: '#F9C900', color: '#000' }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
