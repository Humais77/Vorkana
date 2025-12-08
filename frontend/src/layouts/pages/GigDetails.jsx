// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import { fetchGigById } from '../../redux/slices/gigSlice';
// import { 
//   Star, 
//   Heart, 
//   Share2, 
//   Flag, 
//   Shield, 
//   ChevronRight,
//   ChevronLeft,
//   MessageCircle,
//   Package,
//   FileText,
//   User,
//   Calendar,
//   MapPin,
//   Phone,
//   Mail,
//   Clock,
//   Users,
//   CheckCircle
// } from 'lucide-react';
// import { toast } from 'react-hot-toast';

// const GigDetails = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
  
//   // Get auth state safely
//   const authState = useSelector((state) => state.auth);
//   const user = authState?.user || null;
//   const isAuthenticated = authState?.isAuthenticated || false;
  
//   const { gigDetails: gig, loading, error } = useSelector((state) => state.gigs);
//   const [isLiked, setIsLiked] = useState(false);
//   const [activeImage, setActiveImage] = useState(0);

//   useEffect(() => {
//     if (id) {
//       dispatch(fetchGigById(id));
//     }
//   }, [dispatch, id]);

//   const handleContactSeller = () => {
//     if (!isAuthenticated) {
//       toast.error('Please login to contact seller');
//       navigate('/sign-in');
//       return;
//     }
//     toast.success('Opening chat with seller...');
//   };

//   const handleShare = async () => {
//     const url = window.location.href;
//     try {
//       await navigator.clipboard.writeText(url);
//       toast.success('Link copied to clipboard!');
//     } catch (err) {
//       console.error('Failed to copy:', err);
//     }
//   };

//   const handleReport = () => {
//     toast.info('Report feature coming soon');
//   };

//   const formatPrice = (price) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//     }).format(price);
//   };

//   const renderStars = (rating) => {
//     return (
//       <div className="flex items-center">
//         {[...Array(5)].map((_, i) => (
//           <Star
//             key={i}
//             className={`h-4 w-4 ${
//               i < Math.floor(rating)
//                 ? 'text-yellow-400 fill-yellow-400'
//                 : rating % 1 !== 0 && i === Math.floor(rating)
//                 ? 'text-yellow-400 fill-yellow-400'
//                 : 'text-gray-300'
//             }`}
//           />
//         ))}
//         <span className="ml-2 font-semibold">{rating}</span>
//         <span className="ml-1 text-gray-600">({gig?.reviews?.length || 0})</span>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="animate-pulse">
//             <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <div className="lg:col-span-2">
//                 <div className="bg-gray-200 rounded-2xl h-96 mb-6"></div>
//                 <div className="space-y-4">
//                   <div className="h-6 bg-gray-200 rounded w-1/2"></div>
//                   <div className="h-4 bg-gray-200 rounded w-full"></div>
//                   <div className="h-4 bg-gray-200 rounded w-3/4"></div>
//                 </div>
//               </div>
//               <div className="lg:col-span-1">
//                 <div className="bg-gray-200 rounded-2xl h-96"></div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error || !gig) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
//           <div className="text-red-500 text-6xl mb-4">⚠️</div>
//           <h3 className="text-2xl font-bold text-gray-900 mb-4">
//             Service Not Found
//           </h3>
//           <p className="text-gray-600 mb-8 max-w-md mx-auto">
//             The service you're looking for doesn't exist or has been removed.
//           </p>
//           <button
//             onClick={() => navigate('/gigs')}
//             className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
//           >
//             Browse Services
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Format gig data for display
//   const gigData = {
//     ...gig,
//     images: gig.attachments?.filter(file => 
//       file.type?.includes('image') || 
//       file.name?.match(/\.(jpg|jpeg|png|gif)$/i)
//     ) || [],
//     seller: gig.user || {
//       firstName: gig.fullName?.split(' ')[0] || 'Seller',
//       lastName: gig.fullName?.split(' ')[1] || '',
//       profilePicture: '',
//       rating: 4.8,
//       completedOrders: 0,
//       isVerified: true
//     },
//     reviews: gig.reviews || []
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
//       {/* Breadcrumb */}
//       <div className="bg-white border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <nav className="flex items-center space-x-2 text-sm">
//             <button
//               onClick={() => navigate('/')}
//               className="text-gray-500 hover:text-gray-700 transition-colors"
//             >
//               Home
//             </button>
//             <ChevronRight className="h-4 w-4 text-gray-400" />
//             <button
//               onClick={() => navigate('/gigs')}
//               className="text-gray-500 hover:text-gray-700 transition-colors"
//             >
//               Services
//             </button>
//             <ChevronRight className="h-4 w-4 text-gray-400" />
//             <span className="text-emerald-600 font-medium truncate max-w-xs">
//               {gigData.title || 'Service Details'}
//             </span>
//           </nav>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Left Column - Gig Details */}
//           <div className="lg:col-span-2 space-y-8">
//             {/* Title and Actions */}
//             <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
//               <div className="flex justify-between items-start mb-6">
//                 <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4">
//                   {gigData.title || 'Service Title'}
//                 </h1>
//                 <div className="flex items-center space-x-3">
//                   <button
//                     onClick={() => setIsLiked(!isLiked)}
//                     className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
//                     title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
//                   >
//                     <Heart
//                       className={`h-6 w-6 ${
//                         isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'
//                       }`}
//                     />
//                   </button>
//                   <button
//                     onClick={handleShare}
//                     className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
//                     title="Share"
//                   >
//                     <Share2 className="h-6 w-6 text-gray-400" />
//                   </button>
//                   <button
//                     onClick={handleReport}
//                     className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
//                     title="Report"
//                   >
//                     <Flag className="h-6 w-6 text-gray-400" />
//                   </button>
//                 </div>
//               </div>

//               {/* Seller Info */}
//               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
//                 <div className="flex items-center space-x-4">
//                   <div className="relative">
//                     <img
//                       src={gigData.seller.profilePicture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
//                       alt={gigData.seller.firstName}
//                       className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
//                     />
//                     {gigData.seller.isVerified && (
//                       <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
//                         <CheckCircle className="h-3 w-3 text-white" />
//                       </div>
//                     )}
//                   </div>
//                   <div>
//                     <div className="flex items-center space-x-2 mb-2">
//                       <span className="font-bold text-gray-900 text-lg">
//                         {gigData.seller.firstName} {gigData.seller.lastName}
//                       </span>
//                     </div>
//                     <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
//                       {renderStars(gigData.seller.rating || 4.8)}
//                       <span className="flex items-center">
//                         <Users className="h-4 w-4 mr-1" />
//                         {gigData.seller.completedOrders || 0} orders
//                       </span>
//                       <span className="flex items-center">
//                         <Shield className="h-4 w-4 mr-1" />
//                         100% Success
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <button
//                   onClick={handleContactSeller}
//                   className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
//                 >
//                   <MessageCircle className="h-5 w-5" />
//                   Contact Seller
//                 </button>
//               </div>

//               {/* Budget Info */}
//               <div className="mb-8 p-6 bg-emerald-50 rounded-xl border border-emerald-100">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-xl font-bold text-gray-900 mb-2">Project Budget</h3>
//                     <p className="text-gray-600">Fixed price project</p>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-3xl font-bold text-emerald-600">
//                       {formatPrice(gig.budget || 100)}
//                     </div>
//                     <p className="text-sm text-gray-500 mt-1">Total project cost</p>
//                   </div>
//                 </div>
//               </div>

//               {/* Image Gallery */}
//               {gigData.images.length > 0 && (
//                 <div className="mb-8">
//                   <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
//                     <img
//                       src={gigData.images[activeImage]?.url || gigData.images[activeImage]}
//                       alt={gigData.title}
//                       className="w-full h-full object-cover"
//                     />
//                     {gigData.images.length > 1 && (
//                       <>
//                         <button
//                           onClick={() => setActiveImage((prev) => (prev === 0 ? gigData.images.length - 1 : prev - 1))}
//                           className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
//                         >
//                           <ChevronLeft className="h-6 w-6 text-gray-700" />
//                         </button>
//                         <button
//                           onClick={() => setActiveImage((prev) => (prev === gigData.images.length - 1 ? 0 : prev + 1))}
//                           className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
//                         >
//                           <ChevronRight className="h-6 w-6 text-gray-700" />
//                         </button>
//                       </>
//                     )}
//                   </div>
//                   {gigData.images.length > 1 && (
//                     <div className="flex space-x-3 overflow-x-auto pb-3">
//                       {gigData.images.map((image, index) => (
//                         <button
//                           key={index}
//                           onClick={() => setActiveImage(index)}
//                           className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
//                             activeImage === index
//                               ? 'border-emerald-500'
//                               : 'border-transparent'
//                           }`}
//                         >
//                           <img
//                             src={image.url || image}
//                             alt={`${gigData.title} ${index + 1}`}
//                             className="w-full h-full object-cover"
//                           />
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Description */}
//               <div className="mb-8">
//                 <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
//                   <FileText className="h-6 w-6 text-emerald-600" />
//                   About This Service
//                 </h2>
//                 <div className="prose max-w-none">
//                   <div className="bg-gray-50 rounded-xl p-6">
//                     <p className="text-gray-700 whitespace-pre-line leading-relaxed">
//                       {gigData.description || 'No description provided.'}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Right Column - Gig Info */}
//           <div className="lg:col-span-1">
//             <div className="sticky top-8 space-y-8">
//               {/* Project Details */}
//               <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
//                 <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                   Project Details
//                 </h3>

//                 <div className="space-y-6">
//                   {/* Category */}
//                   {gig.projectCategory?.name && (
//                     <div>
//                       <h4 className="text-sm font-medium text-gray-600 mb-2">Category</h4>
//                       <div className="flex items-center p-3 bg-emerald-50 rounded-lg">
//                         <Package className="h-5 w-5 text-emerald-600 mr-3" />
//                         <span className="font-semibold text-gray-900">{gig.projectCategory.name}</span>
//                       </div>
//                     </div>
//                   )}

//                   {/* Timeline */}
//                   {gig.timeline && (
//                     <div>
//                       <h4 className="text-sm font-medium text-gray-600 mb-2">Timeline</h4>
//                       <div className="flex items-center p-3 bg-blue-50 rounded-lg">
//                         <Clock className="h-5 w-5 text-blue-600 mr-3" />
//                         <span className="font-semibold text-gray-900">{gig.timeline}</span>
//                       </div>
//                     </div>
//                   )}

//                   {/* Location */}
//                   {gig.country && (
//                     <div>
//                       <h4 className="text-sm font-medium text-gray-600 mb-2">Location</h4>
//                       <div className="flex items-center p-3 bg-purple-50 rounded-lg">
//                         <MapPin className="h-5 w-5 text-purple-600 mr-3" />
//                         <span className="font-semibold text-gray-900">{gig.country}</span>
//                       </div>
//                     </div>
//                   )}

//                   {/* Communication */}
//                   {gig.communication && (
//                     <div>
//                       <h4 className="text-sm font-medium text-gray-600 mb-2">Communication</h4>
//                       <div className="flex items-center p-3 bg-teal-50 rounded-lg">
//                         {gig.communication === 'Phone' ? (
//                           <Phone className="h-5 w-5 text-teal-600 mr-3" />
//                         ) : gig.communication === 'Email' ? (
//                           <Mail className="h-5 w-5 text-teal-600 mr-3" />
//                         ) : (
//                           <MessageCircle className="h-5 w-5 text-teal-600 mr-3" />
//                         )}
//                         <span className="font-semibold text-gray-900">{gig.communication}</span>
//                       </div>
//                     </div>
//                   )}

//                   {/* Posted Date */}
//                   <div>
//                     <h4 className="text-sm font-medium text-gray-600 mb-2">Posted</h4>
//                     <div className="flex items-center p-3 bg-gray-50 rounded-lg">
//                       <Calendar className="h-5 w-5 text-gray-600 mr-3" />
//                       <span className="font-semibold text-gray-900">
//                         {new Date(gig.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Contact Button */}
//                 <div className="mt-8 pt-8 border-t border-gray-200">
//                   <button
//                     onClick={handleContactSeller}
//                     className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
//                   >
//                     <MessageCircle className="h-5 w-5" />
//                     Contact Seller
//                   </button>
//                 </div>
//               </div>

//               {/* Seller Stats */}
//               <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
//                 <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
//                   <User className="h-6 w-6 text-emerald-600" />
//                   Seller Information
//                 </h3>
//                 <div className="space-y-5">
//                   <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                     <span className="text-gray-600">Response Time</span>
//                     <span className="font-semibold text-gray-900">Within 24 hours</span>
//                   </div>
//                   <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                     <span className="text-gray-600">Completed Orders</span>
//                     <span className="font-semibold text-emerald-600">{gigData.seller.completedOrders || 0}</span>
//                   </div>
//                   <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                     <span className="text-gray-600">Rating</span>
//                     <span className="font-semibold text-yellow-600">{gigData.seller.rating || 4.8}/5</span>
//                   </div>
//                   <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                     <span className="text-gray-600">Member Since</span>
//                     <span className="font-semibold text-gray-900">2022</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Trust Badges */}
//               <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
//                 <h3 className="text-xl font-bold text-gray-900 mb-6">Why Choose This Service</h3>
//                 <div className="space-y-4">
//                   <div className="flex items-center p-3 bg-gray-50 rounded-lg">
//                     <Shield className="h-8 w-8 text-emerald-600 mr-3" />
//                     <div>
//                       <h4 className="font-semibold text-gray-900">Secure Communication</h4>
//                       <p className="text-sm text-gray-600">All messages are encrypted</p>
//                     </div>
//                   </div>
//                   <div className="flex items-center p-3 bg-gray-50 rounded-lg">
//                     <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
//                     <div>
//                       <h4 className="font-semibold text-gray-900">Verified Seller</h4>
//                       <p className="text-sm text-gray-600">Identity confirmed</p>
//                     </div>
//                   </div>
//                   <div className="flex items-center p-3 bg-gray-50 rounded-lg">
//                     <Clock className="h-8 w-8 text-blue-600 mr-3" />
//                     <div>
//                       <h4 className="font-semibold text-gray-900">24/7 Support</h4>
//                       <p className="text-sm text-gray-600">Always here to help</p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GigDetails;
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  Share2, 
  Flag, 
  Shield, 
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Package,
  FileText,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useGigStore } from '../../store/useGigStore';
import { useGig } from '../../hooks/useGigs';

const GigDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustand stores
  const { user, isAuthenticated } = useAuthStore();
  const { setGigDetails, clearGigDetails } = useGigStore();
  
  // TanStack Query hook for gig data
  const { 
    data: gig, 
    isLoading: loading, 
    error, 
    refetch 
  } = useGig(id);

  // Local state
  const [isLiked, setIsLiked] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Update gig details in store when data loads
  useEffect(() => {
    if (gig) {
      setGigDetails(gig);
    }
  }, [gig, setGigDetails]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      clearGigDetails();
    };
  }, [clearGigDetails]);

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact seller');
      navigate('/sign-in');
      return;
    }
    toast.success('Opening chat with seller...');
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReport = () => {
    toast.info('Report feature coming soon');
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing gig details...');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : rating % 1 !== 0 && i === Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 font-semibold">{rating}</span>
        <span className="ml-1 text-gray-600">({gigData?.reviews?.length || 0})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-200 rounded-2xl h-96 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-gray-200 rounded-2xl h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Service Not Found
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {error?.message || "The service you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/gigs')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Browse Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format gig data for display
  const gigData = {
    ...gig,
    images: gig.attachments?.filter(file => 
      file.type?.includes('image') || 
      file.name?.match(/\.(jpg|jpeg|png|gif)$/i)
    ) || [],
    seller: gig.user || {
      firstName: gig.fullName?.split(' ')[0] || 'Seller',
      lastName: gig.fullName?.split(' ')[1] || '',
      profilePicture: '',
      rating: 4.8,
      completedOrders: 0,
      isVerified: true
    },
    reviews: gig.reviews || []
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Home
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => navigate('/gigs')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Services
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-emerald-600 font-medium truncate max-w-xs">
                {gigData.title || 'Service Details'}
              </span>
            </nav>
            
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gig Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and Actions */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4">
                  {gigData.title || 'Service Title'}
                </h1>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart
                      className={`h-6 w-6 ${
                        isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-6 w-6 text-gray-400" />
                  </button>
                  <button
                    onClick={handleReport}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title="Report"
                  >
                    <Flag className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Seller Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={gigData.seller.profilePicture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                      alt={gigData.seller.firstName}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                    />
                    {gigData.seller.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg">
                        {gigData.seller.firstName} {gigData.seller.lastName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {renderStars(gigData.seller.rating || 4.8)}
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {gigData.seller.completedOrders || 0} orders
                      </span>
                      <span className="flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        100% Success
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleContactSeller}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="h-5 w-5" />
                  Contact Seller
                </button>
              </div>

              {/* Budget Info */}
              <div className="mb-8 p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Project Budget</h3>
                    <p className="text-gray-600">Fixed price project</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatPrice(gig.budget || 100)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Total project cost</p>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              {gigData.images.length > 0 && (
                <div className="mb-8">
                  <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
                    <img
                      src={gigData.images[activeImage]?.url || gigData.images[activeImage]}
                      alt={gigData.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    {gigData.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImage((prev) => (prev === 0 ? gigData.images.length - 1 : prev - 1))}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="h-6 w-6 text-gray-700" />
                        </button>
                        <button
                          onClick={() => setActiveImage((prev) => (prev === gigData.images.length - 1 ? 0 : prev + 1))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                          <ChevronRight className="h-6 w-6 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                  {gigData.images.length > 1 && (
                    <div className="flex space-x-3 overflow-x-auto pb-3">
                      {gigData.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImage(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                            activeImage === index
                              ? 'border-emerald-500'
                              : 'border-transparent'
                          }`}
                        >
                          <img
                            src={image.url || image}
                            alt={`${gigData.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-emerald-600" />
                  About This Service
                </h2>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {gigData.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(gig.updatedAt || gig.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Gig Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">
              {/* Project Details */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Project Details
                </h3>

                <div className="space-y-6">
                  {/* Category */}
                  {gig.projectCategory?.name && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Category</h4>
                      <div className="flex items-center p-3 bg-emerald-50 rounded-lg">
                        <Package className="h-5 w-5 text-emerald-600 mr-3" />
                        <span className="font-semibold text-gray-900">{gig.projectCategory.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {gig.timeline && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Timeline</h4>
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="font-semibold text-gray-900">{gig.timeline}</span>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {gig.country && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Location</h4>
                      <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                        <MapPin className="h-5 w-5 text-purple-600 mr-3" />
                        <span className="font-semibold text-gray-900">{gig.country}</span>
                      </div>
                    </div>
                  )}

                  {/* Communication */}
                  {gig.communication && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Communication</h4>
                      <div className="flex items-center p-3 bg-teal-50 rounded-lg">
                        {gig.communication === 'Phone' ? (
                          <Phone className="h-5 w-5 text-teal-600 mr-3" />
                        ) : gig.communication === 'Email' ? (
                          <Mail className="h-5 w-5 text-teal-600 mr-3" />
                        ) : (
                          <MessageCircle className="h-5 w-5 text-teal-600 mr-3" />
                        )}
                        <span className="font-semibold text-gray-900">{gig.communication}</span>
                      </div>
                    </div>
                  )}

                  {/* Posted Date */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Posted</h4>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600 mr-3" />
                      <span className="font-semibold text-gray-900">
                        {new Date(gig.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Button */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <button
                    onClick={handleContactSeller}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    disabled={!isAuthenticated}
                  >
                    <MessageCircle className="h-5 w-5" />
                    {isAuthenticated ? 'Contact Seller' : 'Login to Contact'}
                  </button>
                </div>
              </div>

              {/* Seller Stats */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="h-6 w-6 text-emerald-600" />
                  Seller Information
                </h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Response Time</span>
                    <span className="font-semibold text-gray-900">Within 24 hours</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Completed Orders</span>
                    <span className="font-semibold text-emerald-600">{gigData.seller.completedOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Rating</span>
                    <span className="font-semibold text-yellow-600">{gigData.seller.rating || 4.8}/5</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-semibold text-gray-900">2022</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Why Choose This Service</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-8 w-8 text-emerald-600 mr-3" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Secure Communication</h4>
                      <p className="text-sm text-gray-600">All messages are encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Verified Seller</h4>
                      <p className="text-sm text-gray-600">Identity confirmed</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <h4 className="font-semibold text-gray-900">24/7 Support</h4>
                      <p className="text-sm text-gray-600">Always here to help</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {gig.fullName || gig.oauthEmail ? (
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Client Information</h3>
                  <div className="space-y-4">
                    {gig.fullName && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <User className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Name</h4>
                          <p className="text-sm text-gray-600">{gig.fullName}</p>
                        </div>
                      </div>
                    )}
                    {gig.oauthEmail && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Contact Email</h4>
                          <p className="text-sm text-gray-600">{gig.oauthEmail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigDetails;