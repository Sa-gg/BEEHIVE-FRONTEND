import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Badge } from '../../components/common/ui/badge'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  BarChart3,
  Filter,
  Building2,
  Zap,
  Users2,
  Wrench,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DateFilter, type DateFilterValue, filterByDateRange } from '../../components/common/DateFilter'

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  [ExpenseCategory.RENT_LEASE]: <Building2 className="h-4 w-4" />,
  [ExpenseCategory.UTILITIES]: <Zap className="h-4 w-4" />,
  [ExpenseCategory.ADMINISTRATIVE_SALARIES]: <Users2 className="h-4 w-4" />,
  [ExpenseCategory.SOFTWARE_SUBSCRIPTIONS]: <Receipt className="h-4 w-4" />,
  [ExpenseCategory.MAINTENANCE]: <Wrench className="h-4 w-4" />,
  [ExpenseCategory.OTHER]: <MoreHorizontal className="h-4 w-4" />,
}

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
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterFrequency, setFilterFrequency] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'all', startDate: null, endDate: null })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  const itemsPerPageOptions = [5, 10, 25, 50, 'all'] as const

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
  const filteredExpenses = filterByDateRange(expenses, dateFilter, 'date')
    .filter(exp => {
      const categoryDisplay = getCategoryDisplay(exp.category)
      const matchesSearch = categoryDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || exp.category === filterCategory
      const matchesFrequency = filterFrequency === 'all' || exp.frequency === filterFrequency
      return matchesSearch && matchesCategory && matchesFrequency
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

  // Pagination logic
  const totalItems = filteredExpenses.length
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / (itemsPerPage as number))
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + (itemsPerPage as number)
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCategory, filterFrequency, dateFilter])

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Expenses & Overhead
            </h1>
            <p className="text-gray-500 mt-1">Track and manage all operational expenses</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Summary Stats - Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Monthly */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <Badge variant="outline" className="bg-white/80 text-xs">MTD</Badge>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total This Month</p>
            <p className="text-2xl font-bold text-gray-900">
              ₱{totalMonthlyOverhead.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-2">{monthlyExpenses.length} transactions</p>
          </div>

          {/* Highest Category */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-5 border border-purple-100 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Highest Category</p>
            <p className="text-lg font-bold text-gray-900 truncate">
              {highestCategory ? highestCategory[0] : 'N/A'}
            </p>
            <p className="text-xs text-purple-600 font-medium mt-2">
              {highestCategory ? `₱${highestCategory[1].toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
            </p>
          </div>

          {/* Average Per Transaction */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <Badge variant="outline" className="bg-white/80 text-xs">AVG</Badge>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900">
              ₱{monthlyExpenses.length > 0 
                ? (totalMonthlyOverhead / monthlyExpenses.length).toLocaleString('en-PH', { minimumFractionDigits: 2 })
                : '0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-2">per expense</p>
          </div>

          {/* Total Records */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <Badge variant="outline" className="bg-white/80 text-xs">ALL</Badge>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
            <p className="text-xs text-gray-400 mt-2">all time</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown Pie */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Category Breakdown</h3>
                  <p className="text-sm text-gray-500">Current month distribution</p>
                </div>
              </div>
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {Object.entries(expensesByCategory).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {Object.entries(expensesByCategory).slice(0, 5).map(([cat, amount], index) => (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm text-gray-600 truncate max-w-[120px]">{cat}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        ₱{(amount / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monthly Trend - Bar Chart */}
          {expenses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Expense Trend</h3>
                  <p className="text-sm text-gray-500">Daily totals this month</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(() => {
                  const dailyTotals: Record<string, number> = {}
                  monthlyExpenses.forEach(exp => {
                    const day = new Date(exp.date).getDate().toString()
                    dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount
                  })
                  return Object.entries(dailyTotals)
                    .map(([day, total]) => ({ day, total }))
                    .sort((a, b) => parseInt(a.day) - parseInt(b.day))
                })()}>
                  <defs>
                    <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Total']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" fill="url(#expenseBarGradient)" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expense Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Expense Records</h2>
                <p className="text-sm text-gray-500">{filteredExpenses.length} of {expenses.length} entries</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 h-9 text-sm"
                  />
                </div>
                
                {/* Date Filter */}
                <DateFilter
                  value={dateFilter}
                  onChange={setDateFilter}
                  showAllOption={true}
                />
                
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Categories</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>

                {/* Frequency Filter */}
                <select
                  value={filterFrequency}
                  onChange={(e) => setFilterFrequency(e.target.value)}
                  className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Frequencies</option>
                  {FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th 
                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </div>
                  </th>
                  <th 
                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th 
                    className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-medium">No expenses found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-5 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(expense.date).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                            {CATEGORY_ICONS[expense.category] || <MoreHorizontal className="h-4 w-4" />}
                          </div>
                          <span className="font-medium text-gray-700">
                            {getCategoryDisplay(expense.category)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {expense.description || <span className="text-gray-400 italic">No description</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-right">
                        <span className="font-bold text-gray-900">
                          ₱{expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <Badge 
                          variant="outline" 
                          className={`${
                            expense.frequency === ExpenseFrequency.ONE_TIME ? 'border-gray-300 text-gray-600' :
                            expense.frequency === ExpenseFrequency.MONTHLY ? 'border-blue-300 text-blue-600 bg-blue-50' :
                            expense.frequency === ExpenseFrequency.QUARTERLY ? 'border-purple-300 text-purple-600 bg-purple-50' :
                            'border-green-300 text-green-600 bg-green-50'
                          }`}
                        >
                          {getFrequencyDisplay(expense.frequency)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : option}
                  </option>
                ))}
              </select>
              <span>entries</span>
              <span className="ml-2 text-gray-500">
                (Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalItems)} of {totalItems})
              </span>
            </div>
            
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="min-w-[36px]"
                      style={currentPage === pageNum ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* New Expense Entry Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingExpense ? 'Update expense details' : 'Record a new business expense'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Expense Category */}
                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="category"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
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
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full h-11 rounded-xl"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Amount (₱) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-11 pl-8 rounded-xl"
                      />
                    </div>
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
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
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
                    Description / Vendor
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., August electricity bill, Coffee supplier payment..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    disabled={submitting}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-6 shadow-lg shadow-amber-500/20"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingExpense ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        {editingExpense ? 'Update' : 'Save'} Expense
                      </>
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
