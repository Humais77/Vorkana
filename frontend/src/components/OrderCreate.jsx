// components/OrderCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Upload, 
  Package,
  Loader2,
  Shield,
  Users
} from 'lucide-react';
import { useCreateOrder } from '../hooks/useOrders'; 
import { useService } from '../hooks/useServices.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { toast } from 'react-hot-toast';

const OrderCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const createOrderMutation = useCreateOrder();
  
  const queryParams = new URLSearchParams(location.search);
  const serviceId = queryParams.get('service');
  const packageId = queryParams.get('package');
  
  const { data: service, isLoading: serviceLoading } = useService(serviceId);
  
  const [requirements, setRequirements] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [extras, setExtras] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!isSecure) {
      toast.error('Please complete security verification to place orders');
    }
  }, [isSecure]);
  
  // Calculate order totals
  const calculateTotals = () => {
    if (!service) return { subtotal: 0, serviceFee: 0, tax: 0, total: 0 };
    
    const basePrice = selectedPackage?.price || service.price || 0;
    let subtotal = basePrice * quantity;
    
    // Add extras
    extras.forEach(extra => {
      subtotal += extra.price * (extra.quantity || 1);
    });
    
    const serviceFee = subtotal * 0.05; // 5% service fee
    const tax = subtotal * 0.10; // 10% tax (example)
    const total = subtotal + serviceFee + tax;
    
    return {
      basePrice,
      subtotal: subtotal.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      currency: service.currency || 'USD'
    };
  };
  
  const totals = calculateTotals();
  
  // Initialize requirements from service
  useEffect(() => {
    if (service?.requirements) {
      setRequirements(service.requirements.map(req => ({
        question: req.question,
        type: req.type,
        required: req.required,
        answer: '',
        files: [],
        options: req.options || []
      })));
    }
  }, [service]);
  
  // Initialize selected package
  useEffect(() => {
    if (service?.packages) {
      if (packageId) {
        const pkg = service.packages.find(p => p._id === packageId);
        if (pkg) setSelectedPackage(pkg);
      } else if (service.packages.length > 0) {
        setSelectedPackage(service.packages[0]);
      }
    }
  }, [service, packageId]);
  
  const handleRequirementChange = (index, value) => {
    const newRequirements = [...requirements];
    newRequirements[index].answer = value;
    setRequirements(newRequirements);
  };
  
  const handleFileUpload = async (index, files) => {
    try {
      const newRequirements = [...requirements];
      newRequirements[index].files = Array.from(files);
      setRequirements(newRequirements);
      toast.success('Files uploaded');
    } catch (error) {
      toast.error('Failed to upload files');
    }
  };
  
  const handleAddExtra = () => {
    setExtras([...extras, {
      title: '',
      description: '',
      price: 0,
      quantity: 1
    }]);
  };
  
  const handleRemoveExtra = (index) => {
    const newExtras = [...extras];
    newExtras.splice(index, 1);
    setExtras(newExtras);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSecure) {
      toast.error('Security verification required');
      return;
    }
    
    // Validate required fields
    const missingRequired = requirements.filter(
      req => req.required && (!req.answer || (req.type === 'file' && req.files.length === 0))
    );
    
    if (missingRequired.length > 0) {
      toast.error(`Please fill all required fields: ${missingRequired.map(r => r.question).join(', ')}`);
      return;
    }
    
    // Prepare order data
    const orderData = {
      service: serviceId,
      package: selectedPackage?._id,
      quantity,
      requirements: requirements.map(req => ({
        question: req.question,
        type: req.type,
        answer: req.type === 'file' ? req.files.map(f => f.name).join(',') : req.answer,
        fileUrl: req.type === 'file' ? req.files.map(f => URL.createObjectURL(f)).join(',') : '',
        required: req.required
      })),
      extras,
      paymentMethod,
      notes,
      currency: service.currency || 'USD'
    };
    
    try {
      await createOrderMutation.mutateAsync(orderData);
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };
  
  if (serviceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading service details...</p>
        </div>
      </div>
    );
  }
  
  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h2>
            <p className="text-gray-600 mb-6">The service you are trying to order does not exist.</p>
            <button
              onClick={() => navigate('/services')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Services
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Place Your Order</h1>
          <p className="text-gray-600 mt-2">Complete your order for: {service.title}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Service Summary */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Package className="w-6 h-6 mr-2 text-blue-600" />
                  Service Details
                </h2>
                <div className="flex items-start gap-4 mb-4">
                  {service.thumbnail && (
                    <img
                      src={service.thumbnail}
                      alt={service.title}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{service.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{service.shortDescription}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-600 mr-1" />
                        <span className="text-sm text-gray-600">
                          {selectedPackage?.deliveryTime || service.deliveryTime} {service.deliveryTimeUnit}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-600 mr-1" />
                        <span className="text-sm text-gray-600">
                          {service.seller?.username || 'Seller'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Packages Selection */}
              {service.packages && service.packages.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Select Package</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {service.packages.map((pkg, index) => (
                      <div
                        key={index}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          selectedPackage?._id === pkg._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${pkg.popular ? 'relative' : ''}`}
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                            Popular
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                            <span className="font-bold text-xl">${pkg.price}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">Delivery:</span>
                            <span className="text-sm font-medium">{pkg.deliveryTime} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">Revisions:</span>
                            <span className="text-sm font-medium">{pkg.revisions || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Requirements */}
              {requirements.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Requirements</h2>
                  <div className="space-y-6">
                    {requirements.map((req, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {req.question}
                              {req.required && <span className="text-red-500 ml-1">*</span>}
                            </h4>
                            <span className="text-xs text-gray-500 mt-1 block">
                              {req.type === 'text' && 'Text input'}
                              {req.type === 'file' && 'File upload'}
                              {req.type === 'choice' && 'Single choice'}
                              {req.type === 'multiple' && 'Multiple choice'}
                            </span>
                          </div>
                        </div>
                        
                        {req.type === 'text' && (
                          <textarea
                            value={req.answer}
                            onChange={(e) => handleRequirementChange(index, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                            placeholder="Your answer..."
                            required={req.required}
                          />
                        )}
                        
                        {req.type === 'file' && (
                          <div>
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleFileUpload(index, e.target.files)}
                              className="hidden"
                              id={`file-upload-${index}`}
                              required={req.required && req.files.length === 0}
                            />
                            <label
                              htmlFor={`file-upload-${index}`}
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                Click to upload files
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {req.files.length > 0 ? `${req.files.length} file(s) selected` : 'No files chosen'}
                              </p>
                            </label>
                            {req.files.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700 mb-1">Selected files:</p>
                                <ul className="space-y-1">
                                  {Array.from(req.files).map((file, fileIndex) => (
                                    <li key={fileIndex} className="text-sm text-gray-600 flex items-center">
                                      <FileText className="w-4 h-4 mr-2" />
                                      {file.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(req.type === 'choice' || req.type === 'multiple') && (
                          <div className="space-y-2">
                            {req.options.map((option, optionIndex) => (
                              <label key={optionIndex} className="flex items-center">
                                <input
                                  type={req.type === 'choice' ? 'radio' : 'checkbox'}
                                  name={`req-${index}`}
                                  value={option}
                                  onChange={(e) => handleRequirementChange(index, e.target.value)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="ml-2 text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quantity */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quantity</h2>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center border-2 border-gray-200 rounded-xl text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center px-4 py-2 border-2 border-gray-200 rounded-xl text-lg font-medium"
                    min="1"
                    max="99"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(prev => Math.min(99, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center border-2 border-gray-200 rounded-xl text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-gray-600">× ${selectedPackage?.price || service.price || 0} each</span>
                </div>
              </div>
              
              {/* Additional Notes */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                  placeholder="Any additional instructions or requirements..."
                />
              </div>
            </div>
            
            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">${selectedPackage?.price || service.price || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${totals.subtotal}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">Service Fee (5%)</span>
                      <span className="font-medium">${totals.serviceFee}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">Tax (10%)</span>
                      <span className="font-medium">${totals.tax}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-gray-900 mr-1" />
                        <span className="text-2xl font-bold text-gray-900">${totals.total}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">in {totals.currency}</p>
                  </div>
                </div>
                
                {/* Security Badge */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Secure Payment</p>
                      <p className="text-xs text-green-700">Your payment is protected by our secure system</p>
                    </div>
                  </div>
                </div>
                
                {/* Payment Method */}
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Payment Method</h3>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer">
                      <input
                        type="radio"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <span className="font-medium text-gray-900">Wallet Balance</span>
                        <p className="text-sm text-gray-600">Use your wallet balance</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer">
                      <input
                        type="radio"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <span className="font-medium text-gray-900">Credit/Debit Card</span>
                        <p className="text-sm text-gray-600">Pay with card</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Place Order (${totals.total})
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  By placing this order, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderCreate;