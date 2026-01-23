// layouts/pages/PublicProfile.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Star,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Briefcase,
  Globe,
  Calendar,
  User,
  Shield,
  Languages,
  ExternalLink,
  Award,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  GraduationCap,
  Activity,
  ArrowLeft,
  EyeOff,
  ShieldCheck,
  MessageCircle,
  Share2,
  Flag,
  Heart,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { useAuthStore } from '../../../store/useAuthStore';
import axios from 'axios';
import { DEFAULT_IMAGES } from '../../../utils/defaultImages';
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';


// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const calculateMemberDuration = (createdAt) => {
  if (!createdAt) return 'Recently';
  const created = new Date(createdAt);
  const now = new Date();
  const diffYears = now.getFullYear() - created.getFullYear();
  const diffMonths = now.getMonth() - created.getMonth();
  
  if (diffYears > 0) {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
  }
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
};

const isUserOnline = (lastSeenAt) => {
  if (!lastSeenAt) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastSeenAt) > fiveMinutesAgo;
};

// Add the missing renderStars function
const renderStars = (rating) => {
  if (!rating) rating = 0;
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
      <span className="ml-2 font-semibold">{rating.toFixed(1)}</span>
    </div>
  );
};

// Main component
const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  
  const [isLiked, setIsLiked] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Fetch public profile data from API
  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/profile/${userId}/public`);
        return response.data;
      } catch (error) {
        console.error('Error fetching public profile:', error);
        throw error;
      }
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const profile = profileData?.profile;
  const isOwnProfile = currentUser?._id === userId;
  
  // Memoized derived data
  const isOnline = useMemo(() => isUserOnline(profile?.lastSeenAt), [profile?.lastSeenAt]);
  const memberDuration = useMemo(() => calculateMemberDuration(profile?.createdAt), [profile?.createdAt]);
  const age = useMemo(() => {
    if (!profile?.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [profile?.dateOfBirth]);
  
  // SEO data
  const seoData = useMemo(() => ({
    title: `${profile?.name || 'User'} - Professional Profile | Vorkanna`,
    description: profile?.bio?.substring(0, 155) || `View ${profile?.name || 'this professional'}'s profile on Vorkanna`,
    canonical: `/profile/${userId}`,
    openGraph: {
      title: `${profile?.name || 'User'} Profile`,
      description: profile?.bio?.substring(0, 200) || 'Professional profile on Vorkanna',
      type: 'profile',
      image: profile?.picture
    }
  }), [profile, userId]);
  
  // Handlers
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleReportProfile = () => {
    toast.info('Report feature coming soon');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error states
  if (error) {
    const errorMessage = error.response?.data?.message || 'Failed to load profile';
    const errorStatus = error.response?.status;
    
    if (errorStatus === 404) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Profile Not Found
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              The user profile you're looking for doesn't exist.
            </p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    if (errorStatus === 403) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Private Profile
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              This user has set their profile to private.
            </p>
            {errorMessage.includes('login') && (
              <div className="mb-6">
                <Link
                  to="/signin"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Sign In to View
                </Link>
              </div>
            )}
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Profile
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {errorMessage}
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return null;
  }
  
  return (
    <SeoWrapper
      title={seoData.title}
      description={seoData.description}
      canonical={seoData.canonical}
      openGraph={seoData.openGraph}
      structuredData={[
        {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": profile.name,
          "description": profile.bio?.substring(0, 200),
          "image": profile.picture,
          "url": window.location.href,
          "email": profile.email,
          "jobTitle": profile.occupation,
          "address": profile.country ? {
            "@type": "PostalAddress",
            "addressCountry": profile.country,
            "addressLocality": profile.city
          } : undefined,
          "alumniOf": profile.education,
          "knowsLanguage": profile.languages,
          "memberOf": "Vorkanna",
          "sameAs": [
            ...(profile.linkedin ? [profile.linkedin] : []),
            ...(profile.github ? [profile.github] : []),
            ...(profile.website ? [profile.website] : [])
          ]
        }
      ]}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Header with Back Button */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              
              <div className="flex items-center gap-3">
                {isOwnProfile && (
                  <Link
                    to="/profile"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Edit Profile
                  </Link>
                )}
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Share Profile"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                {!isOwnProfile && (
                  <>
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                    </button>
                    <button
                      onClick={handleReportProfile}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Report Profile"
                    >
                      <Flag className="w-5 h-5 text-gray-600" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Profile */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Header */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                  <div className="relative">
                    <img
  src={profile.picture || DEFAULT_IMAGES.PROFILE}
  alt={profile.name}
  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover"
  onError={(e) => {
    e.target.src = DEFAULT_IMAGES.PROFILE;
  }}
/>
                    {isOnline && (
                      <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                    {profile.accountType === 'premium' && (
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                      {isOnline && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Online
                        </span>
                      )}
                      {profile.accountType === 'premium' && (
                        <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 text-sm rounded-full">
                          Premium
                        </span>
                      )}
                      {profile.accountType === 'business' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          Business
                        </span>
                      )}
                    </div>
                    
                    {/* ADDED: Email Display Below Name */}
                    {profile.email && profile.privacySettings?.showEmail && (
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{profile.email}</span>
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                          Public Email
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mb-4">
                      {profile.occupation && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Briefcase className="w-4 h-4" />
                          <span>{profile.occupation}</span>
                        </div>
                      )}
                      
                      {profile.education && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <GraduationCap className="w-4 h-4" />
                          <span>{profile.education}</span>
                        </div>
                      )}
                      
                      {profile.city && profile.country && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.city}, {profile.country}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Member for {memberDuration}</span>
                      </div>
                    </div>
                
                  </div>
                </div>
                
              </div>
              
              {/* Bio Section */}
              {profile.bio && (
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="w-6 h-6 text-emerald-600" />
                    About
                  </h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Languages className="w-6 h-6 text-emerald-600" />
                    Languages
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {profile.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              
              {/* Personal Information */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="w-6 h-6 text-emerald-600" />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {age && (
                    <div>
                      <h3 className="text-sm text-gray-500 mb-1">Age</h3>
                      <p className="text-gray-900">{age} years</p>
                    </div>
                  )}
                  
                  {profile.gender && profile.gender !== 'prefer-not-to-say' && (
                    <div>
                      <h3 className="text-sm text-gray-500 mb-1">Gender</h3>
                      <p className="text-gray-900 capitalize">{profile.gender.replace('-', ' ')}</p>
                    </div>
                  )}
                  
                  {profile.dateOfBirth && (
                    <div>
                      <h3 className="text-sm text-gray-500 mb-1">Date of Birth</h3>
                      <p className="text-gray-900">{formatDate(profile.dateOfBirth)}</p>
                    </div>
                  )}
                  
                  {profile.createdAt && (
                    <div>
                      <h3 className="text-sm text-gray-500 mb-1">Member Since</h3>
                      <p className="text-gray-900">{formatDate(profile.createdAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column - Sidebar */}
            <div className="space-y-8">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                <div className="space-y-4">
                  {/* Email Section */}
                  <div className={`flex items-center gap-3 p-3 ${profile.email ? 'bg-gray-50' : 'bg-gray-50/50'} rounded-lg`}>
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Email</p>
                      {profile.email ? (
                        <p className="text-gray-900">{profile.email}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-600 italic">
                            {isOwnProfile 
                              ? "Email is hidden from others" 
                              : "Email is private"
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.privacySettings?.showEmail && profile.email && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                        Public
                      </span>
                    )}
                    {!profile.privacySettings?.showEmail && profile.email && isOwnProfile && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {/* Phone Section */}
                  <div className={`flex items-center gap-3 p-3 ${profile.phoneNumber ? 'bg-gray-50' : 'bg-gray-50/50'} rounded-lg`}>
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Phone</p>
                      {profile.phoneNumber ? (
                        <p className="text-gray-900">{profile.phoneNumber}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-600 italic">
                            {isOwnProfile 
                              ? "Phone number is hidden from others" 
                              : "Phone number is private"
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.privacySettings?.showPhone && profile.phoneNumber && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                        Public
                      </span>
                    )}
                    {!profile.privacySettings?.showPhone && profile.phoneNumber && isOwnProfile && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {/* Privacy Note for Owners */}
                  {isOwnProfile && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">Privacy Settings</h4>
                          <p className="text-sm text-blue-700">
                            You can control what information is visible to others in your 
                            <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
                              Profile Settings
                            </Link>
                          </p>
                          <div className="mt-2 text-xs text-blue-600">
                            <p>• Email is {profile.privacySettings?.showEmail ? 'public' : 'private'}</p>
                            <p>• Phone is {profile.privacySettings?.showPhone ? 'public' : 'private'}</p>
                            <p>• Location is {profile.privacySettings?.showLocation ? 'public' : 'private'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Social Links */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Social Links</h3>
                <div className="space-y-3">
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Linkedin className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-900">LinkedIn</span>
                      <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                    </a>
                  )}
                  
                  {profile.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Github className="w-5 h-5 text-gray-900" />
                      <span className="text-gray-900">GitHub</span>
                      <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                    </a>
                  )}
                  
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Globe className="w-5 h-5 text-emerald-600" />
                      <span className="text-gray-900">Website</span>
                      <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                    </a>
                  )}
                  
                  {!profile.linkedin && !profile.github && !profile.website && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No social links added</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Trust & Safety */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  Trust & Safety
                </h3>
                <div className="space-y-4">
                  {profile.emailVerified && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900">Verified Email</h4>
                        <p className="text-sm text-gray-600">Email address confirmed</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-900">Secure Account</h4>
                      <p className="text-sm text-gray-600">Protected by Vorkanna</p>
                    </div>
                  </div>
                  
                  {profile.accountType === 'premium' && (
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900">Premium Member</h4>
                        <p className="text-sm text-gray-600">Enhanced trust level</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.accountType === 'business' && (
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900">Business Account</h4>
                        <p className="text-sm text-gray-600">Verified business entity</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </SeoWrapper>
  );
};

export default PublicProfile;