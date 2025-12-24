import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  MapPin, 
  TrendingUp, 
  GraduationCap, 
  Languages, 
  Calendar, 
  Activity, 
  Clock,
  ExternalLink,
  Award,
  CheckCircle
} from 'lucide-react';

const UserProfileCard = memo(({ serviceUser, isOnline, accountAge }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
      <Link 
        to={`/profile/${serviceUser._id}`}
        className="flex items-center space-x-4 group cursor-pointer flex-1"
      >
        <div className="relative">
          <img
            src={serviceUser.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
            alt={serviceUser.name}
            className="w-16 h-16 rounded-full border-4 border-white shadow-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all"
            loading="lazy"
          />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
          {serviceUser.emailVerified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">
              {serviceUser.name || 'User'}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {serviceUser.role === 'admin' ? 'Admin' : 'Provider'}
            </span>
            {isOnline && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Online
              </span>
            )}
          </div>
          
          {/* Enhanced User Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
            {serviceUser.occupation && (
              <span className="flex items-center">
                <Briefcase className="h-4 w-4 mr-1" />
                {serviceUser.occupation}
              </span>
            )}
            
            {serviceUser.country && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {serviceUser.city ? `${serviceUser.city}, ${serviceUser.country}` : serviceUser.country}
              </span>
            )}
            
            {serviceUser.rating && (
              <span className="flex items-center">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(serviceUser.rating)
                          ? 'text-yellow-400'
                          : serviceUser.rating % 1 !== 0 && i === Math.floor(serviceUser.rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </div>
                  ))}
                </div>
                <span className="ml-1">({serviceUser.totalReviews || 0})</span>
              </span>
            )}
            
            {serviceUser.education && (
              <span className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-1" />
                {serviceUser.education}
              </span>
            )}
            
            {serviceUser.languages && serviceUser.languages.length > 0 && (
              <span className="flex items-center">
                <Languages className="h-4 w-4 mr-1" />
                {serviceUser.languages.length} language{serviceUser.languages.length !== 1 ? 's' : ''}
              </span>
            )}
            
            {serviceUser.createdAt && (
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Member for {accountAge}
              </span>
            )}
          </div>
          
          {/* User Stats */}
          <div className="flex flex-wrap gap-4 mt-3">
            {serviceUser.completedOrders !== undefined && (
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {serviceUser.completedOrders} completed order{serviceUser.completedOrders !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {serviceUser.responseRate && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {serviceUser.responseRate}% response rate
                </span>
              </div>
            )}
            
            {serviceUser.responseTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Avg. response: {serviceUser.responseTime}h
                </span>
              </div>
            )}
          </div>
          
          {/* View Profile Link */}
          <div className="mt-2">
            <span className="text-emerald-600 text-sm font-medium group-hover:text-emerald-700 flex items-center gap-1">
              View Full Profile
              <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
});

UserProfileCard.displayName = 'UserProfileCard';

export default UserProfileCard;