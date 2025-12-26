import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  TrendingUp,
  DollarSign,
  FileText,
  Loader2
} from 'lucide-react'
import { 
  expensesApi, 
  type Expense, 
  type CreateExpenseDTO,
  type UpdateExpenseDTO,
  ExpenseCategory, 
  ExpenseFrequency,
  getCategoryDisplay,
  getFrequencyDisplay
} from '../../../infrastructure/api/expenses.api'

const EXPENSE_CATEGORIES = [
  { value: ExpenseCategory.RENT_LEASE, label: 'Rent/Lease' },
  { value: ExpenseCategory.UTILITIES, label: 'Utilities (Water/Electricity/Gas)' },
  { value: ExpenseCategory.ADMINISTRATIVE_SALARIES, label: 'Administrative Salaries' },
  { value: ExpenseCategory.SOFTWARE_SUBSCRIPTIONS, label: 'Software/Subscriptions' },
  { value: ExpenseCategory.MAINTENANCE, label: 'Maintenance' },
  { value: ExpenseCategory.OTHER, label: 'Other' }
]

const FREQUENCIES = [
  { value: ExpenseFrequency.ONE_TIME, label: 'One-Time' },
  { value: ExpenseFrequency.MONTHLY, label: 'Monthly' },
  { value: ExpenseFrequency.QUARTERLY, label: 'Quarterly' },
  { value: ExpenseFrequency.ANNUAL, label: 'Annual' }
]

export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof Expense>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    date: '',
    amount: '',
    description: '',
    frequency: ''
  })

  // Calculate monthly totals
  const [currentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await expensesApi.getAll()
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
      console.error('Error loading expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth))
  const totalMonthlyOverhead = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  const expensesByCategory = monthlyExpenses.reduce((acc, exp) => {
    const displayCategory = getCategoryDisplay(exp.category)
    acc[displayCategory] = (acc[displayCategory] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  const highestCategory = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)[0]

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(exp => {
      const categoryDisplay = getCategoryDisplay(exp.category)
      return categoryDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier
    })

  const handleSort = (field: keyof Expense) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.date || !formData.amount || !formData.frequency) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      if (editingExpense) {
        const updateData: UpdateExpenseDTO = {
          category: formData.category as ExpenseCategory,
          date: formData.date,
          amount: parseFloat(formData.amount),
          description: formData.description,
          frequency: formData.frequency as ExpenseFrequency
        }
        await expensesApi.update(editingExpense.id, updateData)
      } else {
        const createData: CreateExpenseDTO = {
          category: formData.category as ExpenseCategory,
          date: formData.date,
          amount: parseFloat(formData.amount),
          description: formData.description,
          frequency: formData.frequency as ExpenseFrequency
        }
        await expensesApi.create(createData)
      }

      await loadExpenses()
      resetForm()
      setIsModalOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save expense')
      console.error('Error saving expense:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category: '',
      date: '',
      amount: '',
      description: '',
      frequency: ''
    })
    setEditingExpense(null)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category,
      date: expense.date.split('T')[0], // Format date for input
      amount: expense.amount.toString(),
      description: expense.description,
      frequency: expense.frequency
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      try {
        await expensesApi.delete(id)
        await loadExpenses()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete expense')
        console.error('Error deleting expense:', err)
      }
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <Button onClick={loadExpenses} className="mt-2">Retry</Button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Overhead and Expense Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage cafe operational expenses</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>

        {/* Financial Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium opacity-90">Total Monthly Overhead (MTD)</h3>
            </div>
            <p className="text-3xl font-bold">₱{totalMonthlyOverhead.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs opacity-75 mt-1">{monthlyExpenses.length} transactions this month</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium opacity-90">Highest Expense Category</h3>
            </div>
            <p className="text-2xl font-bold">
              {highestCategory ? highestCategory[0] : 'N/A'}
            </p>
            <p className="text-sm mt-1">
              {highestCategory ? `₱${highestCategory[1].toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'No data'}
            </p>
          </div>
        </div>

        {/* Recent Expense History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Expense History</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('category')}
                  >
                    Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description/Vendor
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No expenses found</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getCategoryDisplay(expense.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {expense.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ₱{expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getFrequencyDisplay(expense.frequency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Expense Entry Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingExpense ? 'Edit Expense Entry' : 'New Expense Entry'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Expense Category */}
                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Expense Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="category"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Date of Transaction <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Amount (₱) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <Label htmlFor="frequency" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Frequency <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="frequency"
                      required
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select frequency...</option>
                      {FREQUENCIES.map(freq => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Description/Vendor
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., August Electricity Bill, Coffee supplier invoice..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-6"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingExpense ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      editingExpense ? 'Update Expense' : 'Save Expense'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
