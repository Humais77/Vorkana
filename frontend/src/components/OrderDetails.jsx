// components/OrderDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  CheckCircle,
  FileText,
  Upload,
  MessageSquare,
  AlertCircle,
  Loader2,
  Calendar,
  Download,
  Star,
  Send
} from 'lucide-react';
import { 
  useOrder, 
  useUpdateOrderStatus,
  useAddDeliverables,
  useAcceptDelivery,
  useRequestRevision
} from '../hooks/useOrders.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { toast } from 'react-hot-toast';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { data: orderData, isLoading, refetch } = useOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();
  const addDeliverablesMutation = useAddDeliverables();
  const acceptDeliveryMutation = useAcceptDelivery();
  const requestRevisionMutation = useRequestRevision();
  
  const [newMessage, setNewMessage] = useState('');
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [deliverableFiles, setDeliverableFiles] = useState([]);
  const [revisionNotes, setRevisionNotes] = useState('');
  
  const order = orderData?.order;
  
  const isSeller = user?.role === 'seller' && order?.seller?._id === user._id;
  const isBuyer = user?.role === 'user' && order?.buyer?._id === user._id;
  const isAdmin = user?.role === 'admin';
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">The order you are looking for does not exist.</p>
            <button
              onClick={() => navigate('/orders')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleStatusUpdate = async (newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: order._id,
        status: newStatus,
        reason: 'Status updated'
      });
      toast.success(`Order marked as ${newStatus}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };
  
  const handleAddDeliverables = async (e) => {
    e.preventDefault();
    
    if (!deliverableTitle.trim()) {
      toast.error('Please enter a title for the deliverable');
      return;
    }
    
    try {
      await addDeliverablesMutation.mutateAsync({
        id: order._id,
        data: {
          title: deliverableTitle,
          description: deliverableDescription,
          revisionNotes: order.status === 'revision' ? revisionNotes : ''
        },
        files: deliverableFiles
      });
      
      setDeliverableTitle('');
      setDeliverableDescription('');
      setDeliverableFiles([]);
      setRevisionNotes('');
      
      refetch();
    } catch (error) {
      toast.error('Failed to add deliverables');
    }
  };
  
  const handleAcceptDelivery = async () => {
    try {
      await acceptDeliveryMutation.mutateAsync(order._id);
      toast.success('Delivery accepted!');
      refetch();
    } catch (error) {
      toast.error('Failed to accept delivery');
    }
  };
  
  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }
    
    try {
      await requestRevisionMutation.mutateAsync({
        id: order._id,
        revisionNotes
      });
      toast.success('Revision requested!');
      setRevisionNotes('');
      refetch();
    } catch (error) {
      toast.error('Failed to request revision');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Orders
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span>${order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Package className="w-6 h-6 mr-2 text-blue-600" />
                Service Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{order.service?.title || 'Service'}</h3>
                  <p className="text-gray-600 text-sm">{order.service?.description || ''}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Delivery Time</span>
                    <span className="font-medium">
                      {order.deliveryTime} {order.deliveryTimeUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Revisions Included</span>
                    <span className="font-medium">{order.revisions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Quantity</span>
                    <span className="font-medium">{order.quantity || 1}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Buyer/Seller Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2 text-blue-600" />
                {isSeller ? 'Buyer Information' : 'Seller Information'}
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                  {isSeller ? (
                    order.buyer?.picture ? (
                      <img src={order.buyer.picture} alt={order.buyer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                        {order.buyer?.name?.charAt(0) || 'B'}
                      </div>
                    )
                  ) : (
                    order.seller?.picture ? (
                      <img src={order.seller.picture} alt={order.seller.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                        {order.seller?.name?.charAt(0) || 'S'}
                      </div>
                    )
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {isSeller ? order.buyer?.name : order.seller?.name}
                  </h3>
                  <p className="text-gray-600">
                    {isSeller ? order.buyer?.email : order.seller?.email}
                  </p>
                  <div className="flex items-center mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="text-sm font-medium">
                      {isSeller ? order.buyer?.rating?.toFixed(1) : order.seller?.rating?.toFixed(1)}/5
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Requirements */}
            {order.requirements && order.requirements.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                <div className="space-y-4">
                  {order.requirements.map((req, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{req.question}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {req.type}
                        </span>
                      </div>
                      {req.answer && (
                        <div className="mt-2">
                          <p className="text-gray-600">{req.answer}</p>
                        </div>
                      )}
                      {req.files && req.files.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Attachments:</p>
                          <div className="space-y-1">
                            {req.files.map((file, fileIndex) => (
                              <a
                                key={fileIndex}
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {file.split('/').pop()}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Deliverables */}
            {order.deliverables && order.deliverables.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Deliverables</h2>
                <div className="space-y-4">
                  {order.deliverables.map((deliverable, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Delivered: {formatDate(deliverable.deliveredAt)}
                          </p>
                        </div>
                        {deliverable.revisionRequested && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Revision Requested
                          </span>
                        )}
                      </div>
                      
                      {deliverable.description && (
                        <p className="text-gray-600 mb-3">{deliverable.description}</p>
                      )}
                      
                      {deliverable.revisionNotes && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">{deliverable.revisionNotes}</p>
                        </div>
                      )}
                      
                      {deliverable.files && deliverable.files.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Files:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deliverable.files.map((file, fileIndex) => (
                              <a
                                key={fileIndex}
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                              >
                                <FileText className="w-4 h-4 text-gray-600 mr-2" />
                                <span className="text-sm text-gray-700 truncate">
                                  {file.split('/').pop()}
                                </span>
                                <Download className="w-4 h-4 text-gray-400 ml-auto" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Actions & Timeline */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Actions</h2>
              
              {isSeller && (
                <>
                  {order.status === 'pending' && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleStatusUpdate('accepted')}
                        disabled={updateStatusMutation.isPending}
                        className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Accept Order
                      </button>
                      <button
                        onClick={() => handleStatusUpdate('cancelled')}
                        disabled={updateStatusMutation.isPending}
                        className="w-full py-3 border-2 border-red-200 text-red-600 font-medium rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Decline Order
                      </button>
                    </div>
                  )}
                  
                  {(order.status === 'accepted' || order.status === 'in_progress' || order.status === 'revision') && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleStatusUpdate('in_progress')}
                        disabled={updateStatusMutation.isPending || order.status === 'in_progress'}
                        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        Start Working
                      </button>
                      
                      {/* Deliver Work Form */}
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-3">Deliver Work</h3>
                        <form onSubmit={handleAddDeliverables} className="space-y-3">
                          <input
                            type="text"
                            value={deliverableTitle}
                            onChange={(e) => setDeliverableTitle(e.target.value)}
                            placeholder="Deliverable title"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <textarea
                            value={deliverableDescription}
                            onChange={(e) => setDeliverableDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                          />
                          {order.status === 'revision' && (
                            <textarea
                              value={revisionNotes}
                              onChange={(e) => setRevisionNotes(e.target.value)}
                              placeholder="Revision notes (optional)"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows="2"
                            />
                          )}
                          <div>
                            <input
                              type="file"
                              multiple
                              onChange={(e) => setDeliverableFiles(Array.from(e.target.files))}
                              className="hidden"
                              id="deliverable-files"
                            />
                            <label
                              htmlFor="deliverable-files"
                              className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <Upload className="w-5 h-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                {deliverableFiles.length > 0 
                                  ? `${deliverableFiles.length} file(s) selected`
                                  : 'Add files (optional)'}
                              </span>
                            </label>
                          </div>
                          <button
                            type="submit"
                            disabled={addDeliverablesMutation.isPending}
                            className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {addDeliverablesMutation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-5 h-5 mr-2" />
                                Deliver Work
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {isBuyer && order.status === 'delivered' && (
                <div className="space-y-3">
                  <button
                    onClick={handleAcceptDelivery}
                    disabled={acceptDeliveryMutation.isPending}
                    className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Accept Delivery
                  </button>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-3">Request Revision</h3>
                    <textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="What needs to be revised?"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                      rows="3"
                    />
                    <button
                      onClick={handleRequestRevision}
                      disabled={requestRevisionMutation.isPending || !revisionNotes.trim()}
                      className="w-full py-3 border-2 border-orange-200 text-orange-600 font-medium rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Revision
                    </button>
                  </div>
                </div>
              )}
              
              {/* Order Timeline */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Order Timeline</h3>
                <div className="space-y-4">
                  {order.statusHistory?.map((history, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(history.timestamp)}
                        </p>
                        {history.reason && (
                          <p className="text-xs text-gray-600 mt-1">{history.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Time Remaining */}
            {order.deadlineAt && (order.status === 'accepted' || order.status === 'in_progress') && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  Time Remaining
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {Math.ceil((new Date(order.deadlineAt) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </div>
                  <p className="text-sm text-gray-600">Delivery deadline: {formatDate(order.deadlineAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;