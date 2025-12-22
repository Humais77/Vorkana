import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPublicProfile } from '../../hooks/useAuth'; // your existing hook
import default_pp from '../../assets/default_pp-modified.png';
import { MapPin, Briefcase, GraduationCap, Languages, Star, Clock } from 'lucide-react';

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetPublicProfile(userId);

  if (isLoading) return <div className="text-center py-10">Loading profile...</div>;
  if (error || !data?.success) return <div className="text-center py-10 text-red-600">Profile not found or private</div>;

  const profile = data.profile;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-start gap-6 mb-8">
          <img
            src={profile.picture || default_pp}
            alt={profile.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
          />
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}
            {(profile.city || profile.country) && (
              <p className="text-gray-500 flex items-center gap-1 mt-2">
                <MapPin className="w-4 h-4" />
                {profile.city}{profile.city && profile.country && ', '}{profile.country}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">Member for {profile.memberSince}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.occupation && (
            <div>
              <h3 className="font-medium flex items-center gap-2"><Briefcase className="w-5 h-5" /> Occupation</h3>
              <p>{profile.occupation}</p>
            </div>
          )}
          {profile.education && (
            <div>
              <h3 className="font-medium flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Education</h3>
              <p>{profile.education}</p>
            </div>
          )}
          {profile.languages?.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2"><Languages className="w-5 h-5" /> Languages</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.languages.map(lang => (
                  <span key={lang} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{lang}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-medium flex items-center gap-2"><Star className="w-5 h-5" /> Rating</h3>
            <p>{profile.rating || 'No ratings yet'} ({profile.totalReviews || 0} reviews)</p>
          </div>
          {profile.responseTime && (
            <div>
              <h3 className="font-medium flex items-center gap-2"><Clock className="w-5 h-5" /> Response Time</h3>
              <p>{profile.responseTime}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;