// components/SellerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Loader2,
  ExternalLink,
  MessageSquare,
  Calendar,
  Star
} from 'lucide-react';
import { 
  useSellerPendingOrders, 
  useSellerActiveOrders,
  useUpdateOrderStatus,
  useOrderStats
} from '../hooks/useOrders.js';
import { getSocket } from '../socket/orderSocket.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const updateOrderStatusMutation = useUpdateOrderStatus();
  
  const { 
    data: pendingData, 
    isLoading: pendingLoading,
    refetch: refetchPending
  } = useSellerPendingOrders();
  
  const { 
    data: activeData, 
    isLoading: activeLoading,
    refetch: refetchActive
  } = useSellerActiveOrders();
  
  const { data: statsData } = useOrderStats();
  
  const pendingOrders = pendingData?.orders || [];
  const activeOrders = activeData?.orders || [];
  const stats = statsData?.stats || {};
  
  // Initialize socket
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('new_order', (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'new_order',
        message: `New order received: ${data.orderNumber}`,
        amount: `$${data.totalAmount}`,
        orderId: data.orderId,
        timestamp: new Date()
      }, ...prev]);
      
      // Refresh orders list
      refetchPending();
    });
    
    socket.on('order_status_update', (data) => {
      if (data.newStatus === 'completed' || data.newStatus === 'cancelled') {
        refetchActive();
      }
    });
    
    return () => {
      socket.off('new_order');
      socket.off('order_status_update');
    };
  }, [refetchPending, refetchActive]);
  
  const handleAcceptOrder = async (orderId) => {
    try {
      await updateOrderStatusMutation.mutateAsync({
        id: orderId,
        status: 'accepted',
        reason: 'Order accepted'
      });
      toast.success('Order accepted!');
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };
  
  const handleDeclineOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to decline this order?')) {
      try {
        await updateOrderStatusMutation.mutateAsync({
          id: orderId,
          status: 'cancelled',
          reason: 'Declined by seller'
        });
        toast.success('Order declined');
      } catch (error) {
        toast.error('Failed to decline order');
      }
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your orders and services</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Notifications</h3>
                        <button
                          onClick={clearNotifications}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              if (notification.orderId) {
                                navigate(`/orders/${notification.orderId}`);
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{notification.message}</p>
                                {notification.amount && (
                                  <p className="text-sm font-bold text-gray-700 mt-1">{notification.amount}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => navigate('/services/create')}
                className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <Package className="w-5 h-5 mr-2" />
                Create Service
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingOrders || 0}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  Requires attention
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeOrders || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  In progress
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${stats.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  This month
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Order Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${stats.avgOrderValue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                  Growing
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Orders Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Orders
                  {pendingOrders.length > 0 && (
                    <span className="w-6 h-6 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                  activeTab === 'active'
                    ? 'border-b-2 border-green-600 text-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Active Orders
                  {activeOrders.length > 0 && (
                    <span className="w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                      {activeOrders.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          {/* Orders List */}
          <div className="p-6">
            {activeTab === 'pending' ? (
              pendingLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading pending orders...</p>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Orders</h3>
                  <p className="text-gray-600 mb-6">You don't have any pending orders right now</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map(order => (
                    <div key={order._id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-gray-900">{order.orderNumber}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(order.createdAt)}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ${order.totalAmount}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {order.buyer?.name || 'Buyer'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => handleAcceptOrder(order._id)}
                            disabled={updateOrderStatusMutation.isPending}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept Order
                          </button>
                          <button
                            onClick={() => handleDeclineOrder(order._id)}
                            disabled={updateOrderStatusMutation.isPending}
                            className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg font-medium hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => navigate(`/orders/${order._id}`)}
                            className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              activeLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading active orders...</p>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
                  <p className="text-gray-600 mb-6">You don't have any active orders right now</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map(order => (
                    <div key={order._id} className="border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-gray-900">{order.orderNumber}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                            {order.deliverables?.some(d => d.revisionRequested) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Revision Requested
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Deadline: {formatDate(order.deadlineAt)}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ${order.totalAmount}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {order.buyer?.name || 'Buyer'}
                            </div>
                            {order.service?.title && (
                              <div className="flex items-center">
                                <Package className="w-4 h-4 mr-1" />
                                {order.service.title}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => navigate(`/orders/${order._id}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Manage
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{order.progressPercentage || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${order.progressPercentage || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;