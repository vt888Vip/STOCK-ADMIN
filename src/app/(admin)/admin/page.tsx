'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Settings, 
  LogOut, 
  Plus,
  Eye,
  CreditCard,
  History,
  Banknote,
  Building,
  Trash2,
  Edit,
  Target,
  Search,
  X
} from 'lucide-react';
import UploadImage from '@/components/UploadImage';
import { useToast } from '@/components/ui/use-toast';

type TabType = 'dashboard' | 'users' | 'transactions' | 'deposits' | 'banks' | 'orders' | 'session-results' | 'predictions';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [banks, setBanks] = useState([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [newBank, setNewBank] = useState({
    name: '',
    accountNumber: '',
    accountHolder: '',
    branch: ''
  });
  
  // User management states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // Bank management states
  const [editingBank, setEditingBank] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showBankDeleteConfirm, setShowBankDeleteConfirm] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<any>(null);

  // Search states
  const [searchName, setSearchName] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  // 1. Thêm state cho searchOrderDate
  const [searchOrderDate, setSearchOrderDate] = useState('');
  
  // Orders search and pagination states
  const [searchOrderUsername, setSearchOrderUsername] = useState('');
  const [searchOrderSessionId, setSearchOrderSessionId] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng đăng nhập để truy cập trang quản trị',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (!isAdmin()) {
        toast({
          title: 'Lỗi',
          description: 'Bạn không có quyền truy cập trang này',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router, toast]);

  // Load dữ liệu
  useEffect(() => {
    if (isAuthenticated() && isAdmin()) {
      loadData();
    }
  }, [isAuthenticated, isAdmin]);

  // Reload orders when search criteria change
  useEffect(() => {
    if (isAuthenticated() && isAdmin() && activeTab === 'orders') {
      loadOrders();
    }
  }, [searchOrderUsername, searchOrderSessionId, searchOrderDate, ordersPage, activeTab]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', ordersPage.toString());
      params.append('limit', '10');
      if (searchOrderUsername) params.append('username', searchOrderUsername);
      if (searchOrderSessionId) params.append('sessionId', searchOrderSessionId);
      if (searchOrderDate) {
        const date = new Date(searchOrderDate);
        params.append('startDate', date.toISOString());
        params.append('endDate', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());
      }

      const ordersResponse = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        if (ordersData.success && ordersData.data) {
          setOrders(ordersData.data.orders || []);
          setOrdersTotalPages(ordersData.data.pagination.totalPages);
          setOrdersTotal(ordersData.data.pagination.total);
        } else {
          setOrders([]);
          setOrdersTotalPages(1);
          setOrdersTotal(0);
        }
      } else {
        setOrders([]);
        setOrdersTotalPages(1);
        setOrdersTotal(0);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setOrdersTotalPages(1);
      setOrdersTotal(0);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await fetch('/api/admin/stats', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load users
      const usersResponse = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Load transactions
      const transactionsResponse = await fetch('/api/admin/transactions', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

      // Load deposits
      const depositsResponse = await fetch('/api/admin/deposits', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (depositsResponse.ok) {
        const depositsData = await depositsResponse.json();
        setDeposits(depositsData.deposits || []);
      }

      // Load banks
      const banksResponse = await fetch('/api/admin/banks', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (banksResponse.ok) {
        const banksData = await banksResponse.json();
        setBanks(banksData.banks || []);
      }

      // Load initial orders
      if (activeTab === 'orders') {
        loadOrders();
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter users based on search criteria
  const filteredUsers = users.filter((user: any) => {
    const nameMatch = searchName === '' || 
      user.username?.toLowerCase().includes(searchName.toLowerCase());
    
    const dateMatch = () => {
      if (!searchDateFrom) return true;
      
      const userDate = new Date(user.createdAt);
      const searchDate = new Date(searchDateFrom);
      
      return userDate.toDateString() === searchDate.toDateString();
    };
    
    return nameMatch && dateMatch();
  });

  const handleDeposit = async () => {
    if (!selectedUser || !depositAmount) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn người dùng và nhập số tiền',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          amount: parseFloat(depositAmount),
          note: depositNote
        })
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã nạp tiền cho người dùng',
        });
        setDepositAmount('');
        setDepositNote('');
        setSelectedUser(null);
        loadData(); // Reload data
      } else {
        throw new Error('Failed to deposit');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể nạp tiền',
        variant: 'destructive',
      });
    }
  };

  const handleAddBank = async () => {
    if (!newBank.name || !newBank.accountNumber || !newBank.accountHolder) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin ngân hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newBank)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã thêm ngân hàng mới',
        });
        setNewBank({ name: '', accountNumber: '', accountHolder: '', branch: '' });
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thêm ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleEditBank = (bank: any) => {
    setEditingBank({ ...bank });
    setShowBankModal(true);
  };

  const handleUpdateBank = async () => {
    if (!editingBank.name || !editingBank.accountNumber || !editingBank.accountHolder) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin ngân hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/banks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingBank)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật ngân hàng',
        });
        setShowBankModal(false);
        setEditingBank(null);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể cập nhật ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBank = (bank: any) => {
    setBankToDelete(bank);
    setShowBankDeleteConfirm(true);
  };

  const confirmDeleteBank = async () => {
    if (!bankToDelete) return;

    try {
      const response = await fetch(`/api/admin/banks?id=${bankToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã xóa ngân hàng',
        });
        setShowBankDeleteConfirm(false);
        setBankToDelete(null);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể xóa ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleProcessDeposit = async (depositId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          depositId,
          action,
          note: action === 'approve' ? 'Được duyệt bởi admin' : 'Bị từ chối bởi admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Thành công',
          description: result.message,
        });
        loadData(); // Reload data to update the list
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể xử lý yêu cầu nạp tiền',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xử lý yêu cầu nạp tiền',
        variant: 'destructive',
      });
    }
  };

  // User management functions
  const handleViewUser = (user: any) => {
    setEditingUser({ ...user });
    setShowUserModal(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingUser)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin người dùng',
        });
        setShowUserModal(false);
        setEditingUser(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể cập nhật người dùng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật người dùng',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã xóa người dùng',
        });
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể xóa người dùng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa người dùng',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  // Không render nếu không có quyền
  if (!isAuthenticated() || !isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Xin chào, {user?.username}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Quản lý người dùng
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'transactions'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Lịch sử giao dịch
            </button>
            <button
              onClick={() => setActiveTab('deposits')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'deposits'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Banknote className="h-4 w-4 inline mr-2" />
              Nạp tiền
            </button>
            <button
              onClick={() => setActiveTab('banks')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'banks'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Building className="h-4 w-4 inline mr-2" />
              Quản lý ngân hàng
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Lệnh đặt
            </button>
            <button
              onClick={() => setActiveTab('session-results')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'session-results'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Kết quả phiên giao dịch
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">+12% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng nạp tiền</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalDeposits.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">+8% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng rút tiền</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalWithdrawals.toLocaleString()}</p>
                      <p className="text-xs text-red-600 mt-1">+5% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Người dùng hoạt động</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</p>
                      <p className="text-xs text-purple-600 mt-1">+15% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                      <Settings className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Người dùng mới nhất</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Số dư</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 5).map((user: any) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-bold text-green-600">
                              {user.balance?.available?.toLocaleString() || 0}đ
                            </div>
                            <div className="text-xs text-gray-500">
                              Đã nạp: {user.totalDeposited?.toLocaleString() || 0}đ
                            </div>
                            {user.totalWithdrawn > 0 && (
                              <div className="text-xs text-red-500">
                                Đã rút: {user.totalWithdrawn?.toLocaleString() || 0}đ
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status?.active ? 'default' : 'destructive'}>
                            {user.status?.active ? 'Hoạt động' : 'Khóa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Quản lý người dùng</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search Filters */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Tìm kiếm người dùng</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="searchName" className="text-gray-700 font-medium">Tìm kiếm theo tên</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="searchName"
                        placeholder="Nhập tên người dùng..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="searchDateFrom" className="text-gray-700 font-medium">Ngày tạo giao dịch</Label>
                    <Input
                      id="searchDateFrom"
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => setSearchDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchName('');
                      setSearchDateFrom('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </Button>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tìm thấy {filteredUsers.length} người dùng
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Username</TableHead>
                      <TableHead className="font-semibold text-gray-700">Vai trò</TableHead>
                      <TableHead className="font-semibold text-gray-700">Số dư</TableHead>
                      <TableHead className="font-semibold text-gray-700">CCCD</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ngân hàng</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ngày tạo</TableHead>
                      <TableHead className="font-semibold text-gray-700">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      {/* Vai trò */}
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-purple-500 text-white">Quản trị viên</span>
                        ) : (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-500 text-white">Người dùng</span>
                        )}
                      </TableCell>
                      {/* Số dư */}
                      <TableCell>
                        <div>
                          <div className="font-bold text-green-600">
                            {user.balance?.available?.toLocaleString() || 0}đ
                          </div>
                          <div className="text-xs text-gray-500">
                            Đã nạp: {user.totalDeposited?.toLocaleString() || 0}đ
                          </div>
                        </div>
                      </TableCell>
                      {/* CCCD */}
                      <TableCell>
                        {user.verification?.verified ? (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white">Đã xác minh</span>
                        ) : (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-500 text-white">Đang xác minh</span>
                        )}
                      </TableCell>
                      {/* Ngân hàng */}
                      <TableCell>
                        {user.bank?.name ? (
                          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                            <div className="font-medium text-green-800">{user.bank.name}</div>
                            <div className="text-sm text-green-600 font-mono">{user.bank.accountNumber}</div>
                            <div className="text-xs text-green-500">{user.bank.accountHolder}</div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <span className="text-gray-500 text-sm">Chưa cập nhật</span>
                          </div>
                        )}
                      </TableCell>
                      {/* Trạng thái tài khoản */}
                      <TableCell>
                        {user.status?.active ? (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white">Hoạt động</span>
                        ) : (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white">Bị khóa</span>
                        )}
                      </TableCell>
                      {/* Ngày tạo */}
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      {/* Hành động */}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user)}
                            className="hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.role === 'admin'}
                            className="hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử giao dịch</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="font-medium">{transaction.username}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                          {transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount.toLocaleString()}đ
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.type === 'deposit'
                            ? (transaction.status === 'completed' ? 'default' : 'destructive')
                            : transaction.status === 'Đã duyệt' ? 'default' : transaction.status === 'Từ chối' ? 'destructive' : 'secondary'
                        }>
                          {transaction.type === 'deposit'
                            ? (transaction.status === 'completed' ? 'Hoàn thành' : transaction.status === 'rejected' ? 'Từ chối' : 'Đang xử lý')
                            : transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.note || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {(transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'Đang xử lý' || transaction.status === 'Chờ duyệt') && (
                          <div className="flex gap-2">
                            <button
                              className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition"
                              onClick={async () => {
                                if (transaction.type === 'withdrawal') {
                                  const withdrawalId = transaction.withdrawalId || (typeof transaction._id === 'string' ? transaction._id : transaction._id?.toString?.() || '');
                                  console.log('Duyệt rút tiền:', { withdrawalId, _id: transaction._id, raw: transaction });
                                  if (!withdrawalId || !withdrawalId.startsWith('RUT-')) {
                                    alert('Không tìm thấy withdrawalId hợp lệ để duyệt!');
                                    return;
                                  }
                                  const res = await fetch('/api/admin/withdrawals', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ withdrawalId, action: 'approve' })
                                  });
                                  if (!res.ok) {
                                    const data = await res.json();
                                    alert(data.message || 'Lỗi khi duyệt rút tiền!');
                                  }
                                  loadData();
                                } else {
                                  await fetch('/api/admin/transactions', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ transactionId: transaction._id, action: 'approve' })
                                  });
                                  loadData();
                                }
                              }}
                            >
                              Duyệt
                            </button>
                            <button
                              className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                              onClick={async () => {
                                if (transaction.type === 'withdrawal') {
                                  const withdrawalId = transaction.withdrawalId || (typeof transaction._id === 'string' ? transaction._id : transaction._id?.toString?.() || '');
                                  console.log('Từ chối rút tiền:', { withdrawalId, _id: transaction._id, raw: transaction });
                                  if (!withdrawalId || !withdrawalId.startsWith('RUT-')) {
                                    alert('Không tìm thấy withdrawalId hợp lệ để từ chối!');
                                    return;
                                  }
                                  const res = await fetch('/api/admin/withdrawals', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ withdrawalId, action: 'reject' })
                                  });
                                  if (!res.ok) {
                                    const data = await res.json();
                                    alert(data.message || 'Lỗi khi từ chối rút tiền!');
                                  }
                                  loadData();
                                } else {
                                  await fetch('/api/admin/transactions', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ transactionId: transaction._id, action: 'reject' })
                                  });
                                  loadData();
                                }
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="space-y-6">
            {/* Manual Deposit Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nạp tiền thủ công</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user">Chọn người dùng</Label>
                                         <Select onValueChange={(value: string) => {
                       const user = users.find((u: any) => u._id === value);
                       setSelectedUser(user);
                     }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn người dùng" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.username} - {user.balance?.available?.toLocaleString() || 0}đ (Đã nạp: {user.totalDeposited?.toLocaleString() || 0}đ)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Số tiền</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Nhập số tiền"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="note">Ghi chú</Label>
                  <Textarea
                    id="note"
                    placeholder="Ghi chú về giao dịch"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                  />
                </div>
                <Button onClick={handleDeposit} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Nạp tiền
                </Button>
              </CardContent>
            </Card>

            {/* Deposit Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu nạp tiền</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Ngân hàng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit: any) => (
                      <TableRow key={deposit._id}>
                        <TableCell className="font-medium">{deposit.username}</TableCell>
                        <TableCell>{deposit.amount.toLocaleString()}đ</TableCell>
                        <TableCell>
                          {deposit.bankInfo?.name ? (
                            <div>
                              <div className="font-medium">{deposit.bankInfo.name}</div>
                              <div className="text-sm text-gray-500">{deposit.bankInfo.accountNumber}</div>
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            deposit.status === 'CHO XU LY' ? 'secondary' : 
                            deposit.status === 'DA DUYET' ? 'default' : 
                            'destructive'
                          }>
                            {deposit.status === 'CHO XU LY' ? 'Chờ xử lý' : 
                             deposit.status === 'DA DUYET' ? 'Đã duyệt' : 
                             deposit.status === 'TU CHOI' ? 'Đã từ chối' : 
                             deposit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(deposit.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          {deposit.status === 'CHO XU LY' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleProcessDeposit(deposit._id, 'approve')}
                              >
                                Duyệt
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleProcessDeposit(deposit._id, 'reject')}
                              >
                                Từ chối
                              </Button>
                            </div>
                          )}
                          {deposit.status === 'DA DUYET' && (
                            <Badge variant="default">Đã duyệt</Badge>
                          )}
                          {deposit.status === 'TU CHOI' && (
                            <Badge variant="destructive">Đã từ chối</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Banks Tab */}
        {activeTab === 'banks' && (
          <div className="space-y-6">
            {/* Add Bank Form */}
            <Card>
              <CardHeader>
                <CardTitle>Thêm ngân hàng mới</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Tên ngân hàng</Label>
                    <Input
                      id="bankName"
                      placeholder="VD: Vietcombank"
                      value={newBank.name}
                      onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Số tài khoản</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Số tài khoản"
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountHolder">Chủ tài khoản</Label>
                    <Input
                      id="accountHolder"
                      placeholder="Tên chủ tài khoản"
                      value={newBank.accountHolder}
                      onChange={(e) => setNewBank({...newBank, accountHolder: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch">Chi nhánh</Label>
                    <Input
                      id="branch"
                      placeholder="Chi nhánh (tùy chọn)"
                      value={newBank.branch}
                      onChange={(e) => setNewBank({...newBank, branch: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleAddBank} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm ngân hàng
                </Button>
              </CardContent>
            </Card>

            {/* Banks List */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách ngân hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên ngân hàng</TableHead>
                      <TableHead>Số tài khoản</TableHead>
                      <TableHead>Chủ tài khoản</TableHead>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banks.map((bank: any) => (
                      <TableRow key={bank._id}>
                        <TableCell className="font-medium">{bank.name}</TableCell>
                        <TableCell>{bank.accountNumber}</TableCell>
                        <TableCell>{bank.accountHolder}</TableCell>
                        <TableCell>{bank.branch || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={bank.status === 'active' ? 'default' : 'secondary'}>
                            {bank.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBank(bank)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteBank(bank)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dự đoán phiên giao dịch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Quản lý dự đoán phiên giao dịch</h3>
                  <p className="text-gray-600 mb-4">
                    Xem trước và quản lý kết quả của 30 phiên giao dịch tiếp theo
                  </p>
                  <Button 
                    onClick={() => router.push('/admin/predictions')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Mở trang dự đoán
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <History className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Lịch sử lệnh đặt</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi toàn bộ lệnh đặt của người dùng</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 space-y-4">
                {/* Search filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Tên tài khoản:
                      <input
                        type="text"
                        placeholder="Nhập tên tài khoản..."
                        value={searchOrderUsername}
                        onChange={e => setSearchOrderUsername(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Phiên giao dịch:
                      <input
                        type="text"
                        placeholder="Nhập mã phiên..."
                        value={searchOrderSessionId}
                        onChange={e => setSearchOrderSessionId(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Ngày đặt lệnh:
                      <input
                        type="date"
                        value={searchOrderDate}
                        onChange={e => setSearchOrderDate(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchOrderUsername('');
                        setSearchOrderSessionId('');
                        setSearchOrderDate('');
                        setOrdersPage(1);
                      }}
                      className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
                
                {/* Results info */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Tìm thấy {ordersTotal} lệnh đặt
                  </div>
                  <div className="text-sm text-gray-600">
                    Trang {ordersPage} / {ordersTotalPages}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Username</TableHead>
                      <TableHead className="font-semibold text-gray-700">Phiên</TableHead>
                      <TableHead className="font-semibold text-gray-700">Loại lệnh</TableHead>
                      <TableHead className="font-semibold text-gray-700">Số tiền</TableHead>
                      <TableHead className="font-semibold text-gray-700">Lợi nhuận</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-gray-700">Thời gian đặt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any, idx: number) => (
                      <TableRow key={order._id || idx} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{order.username}</TableCell>
                        <TableCell className="font-mono text-sm">{order.sessionId}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.direction === 'UP' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {order.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-blue-700">{order.amount.toLocaleString()}đ</span>
                        </TableCell>
                        <TableCell>
                          {order.profit > 0 ? (
                            <span className="font-bold text-green-600">+{order.profit.toLocaleString()}đ</span>
                          ) : order.profit < 0 ? (
                            <span className="font-bold text-red-600">{order.profit.toLocaleString()}đ</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.status === 'completed' && order.result === 'win' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white">Thắng</span>
                          )}
                          {order.status === 'completed' && order.result === 'lose' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white">Thua</span>
                          )}
                          {order.status === 'pending' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-500 text-white">Đang xử lý</span>
                          )}
                          {order.status === 'completed' && !order.result && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-gray-500 text-white">Hoàn thành</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {ordersTotalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                      disabled={ordersPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    
                    {Array.from({ length: Math.min(5, ordersTotalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(ordersTotalPages - 4, ordersPage - 2)) + i;
                      if (pageNum > ordersTotalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setOrdersPage(pageNum)}
                          className={`px-3 py-1 border rounded text-sm ${
                            pageNum === ordersPage
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setOrdersPage(Math.min(ordersTotalPages, ordersPage + 1))}
                      disabled={ordersPage === ordersTotalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Session Results Tab */}
        {activeTab === 'session-results' && (
          <div className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Quản lý kết quả phiên giao dịch</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Đặt kết quả thủ công hoặc tạo ngẫu nhiên cho các phiên giao dịch</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Chức năng quản lý kết quả phiên giao dịch</h3>
                  <p className="text-gray-500 mb-4">
                    Tính năng này cho phép admin đặt kết quả thủ công hoặc tạo ngẫu nhiên cho các phiên giao dịch.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Đặt kết quả thủ công (LÊN/XUỐNG) cho từng phiên</p>
                    <p>• Tạo kết quả ngẫu nhiên cho từng phiên</p>
                    <p>• Tạo kết quả hàng loạt cho nhiều phiên</p>
                    <p>• Theo dõi trạng thái và kết quả của các phiên</p>
                  </div>
                  <div className="mt-6">
                    <Button 
                      onClick={() => window.open('/admin/session-results', '_blank')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Mở trang quản lý kết quả phiên giao dịch
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Edit Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thông tin người dùng</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={editingUser.username || ''}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Vai trò</Label>
                    <Select
                      value={editingUser.role || 'user'}
                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Số dư khả dụng</Label>
                    <Input
                      type="number"
                      value={editingUser.balance?.available || 0}
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        balance: {...editingUser.balance, available: Number(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Trạng thái hoạt động</Label>
                    <Select
                      value={editingUser.status?.active ? 'true' : 'false'}
                      onValueChange={(value) => setEditingUser({
                        ...editingUser, 
                        status: {...editingUser.status, active: value === 'true'}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Hoạt động</SelectItem>
                        <SelectItem value="false">Khóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Thông tin ngân hàng</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input
                      placeholder="Tên ngân hàng"
                      value={editingUser.bank?.name || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        bank: {...editingUser.bank, name: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="Số tài khoản"
                      value={editingUser.bank?.accountNumber || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        bank: {...editingUser.bank, accountNumber: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="Chủ tài khoản"
                      value={editingUser.bank?.accountHolder || ''}
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        bank: {...editingUser.bank, accountHolder: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Xác minh CCCD</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-sm">Mặt trước</Label>
                      {editingUser.verification?.cccdFront ? (
                        <div className="relative">
                          <img 
                            src={editingUser.verification.cccdFront} 
                            alt="CCCD Front" 
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setEditingUser({
                              ...editingUser,
                              verification: {...editingUser.verification, cccdFront: ''}
                            })}
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <UploadImage
                          onChange={(files) => {
                            if (files.length > 0 && files[0].url) {
                              setEditingUser({
                                ...editingUser,
                                verification: {...editingUser.verification, cccdFront: files[0].url}
                              });
                            }
                          }}
                          maxCount={1}
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-sm">Mặt sau</Label>
                      {editingUser.verification?.cccdBack ? (
                        <div className="relative">
                          <img 
                            src={editingUser.verification.cccdBack} 
                            alt="CCCD Back" 
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setEditingUser({
                              ...editingUser,
                              verification: {...editingUser.verification, cccdBack: ''}
                            })}
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <UploadImage
                          onChange={(files) => {
                            if (files.length > 0 && files[0].url) {
                              setEditingUser({
                                ...editingUser,
                                verification: {...editingUser.verification, cccdBack: files[0].url}
                              });
                            }
                          }}
                          maxCount={1}
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Select
                      value={editingUser.verification?.verified ? 'true' : 'false'}
                      onValueChange={(value) => setEditingUser({
                        ...editingUser, 
                        verification: {...editingUser.verification, verified: value === 'true'}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Đã xác minh</SelectItem>
                        <SelectItem value="false">Chưa xác minh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowUserModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleEditUser}>
                    <Edit className="h-4 w-4 mr-2" />
                    Cập nhật
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Bạn có chắc chắn muốn xóa người dùng <strong>{userToDelete?.username}</strong>?</p>
              <p className="text-sm text-gray-500 mt-2">Hành động này không thể hoàn tác.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bank Edit Modal */}
        <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sửa thông tin ngân hàng</DialogTitle>
            </DialogHeader>
            {editingBank && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tên ngân hàng</Label>
                    <Input
                      value={editingBank.name || ''}
                      onChange={(e) => setEditingBank({...editingBank, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Số tài khoản</Label>
                    <Input
                      value={editingBank.accountNumber || ''}
                      onChange={(e) => setEditingBank({...editingBank, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Chủ tài khoản</Label>
                    <Input
                      value={editingBank.accountHolder || ''}
                      onChange={(e) => setEditingBank({...editingBank, accountHolder: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Chi nhánh</Label>
                    <Input
                      value={editingBank.branch || ''}
                      onChange={(e) => setEditingBank({...editingBank, branch: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Trạng thái</Label>
                    <Select
                      value={editingBank.status || 'active'}
                      onValueChange={(value) => setEditingBank({...editingBank, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Không hoạt động</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdateBank} className="flex-1">
                    Cập nhật
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBankModal(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bank Delete Confirmation Dialog */}
        <Dialog open={showBankDeleteConfirm} onOpenChange={setShowBankDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa ngân hàng</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Bạn có chắc chắn muốn xóa ngân hàng này không?</p>
              {bankToDelete && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p><strong>Tên ngân hàng:</strong> {bankToDelete.name}</p>
                  <p><strong>Số tài khoản:</strong> {bankToDelete.accountNumber}</p>
                  <p><strong>Chủ tài khoản:</strong> {bankToDelete.accountHolder}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={confirmDeleteBank}
                className="flex-1"
              >
                Xóa
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBankDeleteConfirm(false)}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

