import React, { useState, useMemo } from 'react';
import {
  User,
  Calendar,
  MapPin,
  Globe,
  Award,
  Star,
  Edit2,
  DollarSign,
  ArrowRightLeft,
  Package,
  Check,
  Save,
  X,
  Mail,
  Phone,
  Linkedin,
  Github,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';

const ProfileSidebar = ({ 
  onSwitchToUser, 
  onSwitchToSeller, 
  switchRoleMutation 
}) => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    skills: [],
    hourlyRate: '',
    availability: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    experience: '',
    education: ''
  });

  React.useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        skills: user.skills || [],
        hourlyRate: user.hourlyRate || '',
        availability: user.availability || '',
        email: user.email || '',
        phone: user.phone || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        experience: user.experience || '',
        education: user.education || ''
      });
    }
  }, [user]);

  const profileData = useMemo(() => ({
    name: user?.name || 'Your Name',
    bio: user?.bio || 'Tell us about yourself...',
    location: user?.location || 'Add your location',
    skills: user?.skills || [],
    hourlyRate: user?.hourlyRate || 0,
    availability: user?.availability || 'Not specified',
    email: user?.email || '',
    phone: user?.phone || 'Not provided',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    experience: user?.experience || 'Add your experience',
    education: user?.education || 'Add your education'
  }), [user]);

  const handleSave = async () => {
    try {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: user.name || '',
      bio: user.bio || '',
      location: user.location || '',
      skills: user.skills || [],
      hourlyRate: user.hourlyRate || '',
      availability: user.availability || '',
      email: user.email || '',
      phone: user.phone || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      experience: user.experience || '',
      education: user.education || ''
    });
    setIsEditing(false);
  };

  const handleSkillAdd = (skill) => {
    if (skill.trim() && !editForm.skills.includes(skill.trim())) {
      setEditForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6  top-8">
    
      <div className="text-center mb-8">
        <div className="relative mx-auto w-32 h-32 mb-4">
          <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-4xl font-bold ${
            user?.role === 'seller' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600'
          }`}>
            {profileData.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            {isEditing ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Edit2 className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
            className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 w-full mb-2"
            placeholder="Your Name"
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
        )}
        
        {isEditing ? (
          <input
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
            className="text-gray-600 mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 w-full"
            placeholder="Your Email"
          />
        ) : (
          <p className="text-gray-600 mt-1">{profileData.email}</p>
        )}
        
        <div className="flex items-center justify-center mt-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            user?.role === 'seller' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user?.role === 'seller' ? (
              <>
                <Package className="w-3 h-3 mr-1" />
                Seller
              </>
            ) : (
              <>
                <User className="w-3 h-3 mr-1" />
                User
              </>
            )}
          </span>
          <span className="mx-2 text-gray-400">•</span>
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="ml-1 font-medium">4.8</span>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={user?.role === 'seller' ? onSwitchToUser : onSwitchToSeller}
          disabled={switchRoleMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span className="font-medium">
            {switchRoleMutation.isPending 
              ? 'Switching...' 
              : `Switch to ${user?.role === 'seller' ? 'User' : 'Seller'}`
            }
          </span>
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {user?.role === 'seller' 
            ? 'Switch back to user account' 
            : 'Switch to seller account to create gigs'}
        </p>
      </div>

      {isEditing && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}

      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          About
        </h3>
        {isEditing ? (
          <textarea
            value={editForm.bio}
            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm resize-none"
            rows="4"
            placeholder="Tell us about yourself, your experience, and what you do..."
          />
        ) : (
          <p className="text-gray-600 text-sm">
            {profileData.bio}
          </p>
        )}
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Award className="w-4 h-4 mr-2" />
          Skills
        </h3>
        {isEditing ? (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add a skill and press Enter"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSkillAdd(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add a skill and press Enter"]');
                  handleSkillAdd(input.value);
                  input.value = '';
                }}
                className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editForm.skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {skill}
                  <button
                    onClick={() => handleSkillRemove(skill)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profileData.skills.length > 0 ? (
              profileData.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">No skills added yet</span>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <>
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Experience
            </h3>
            <textarea
              value={editForm.experience}
              onChange={(e) => setEditForm({...editForm, experience: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm resize-none"
              rows="3"
              placeholder="Add your work experience..."
            />
          </div>
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Education
            </h3>
            <textarea
              value={editForm.education}
              onChange={(e) => setEditForm({...editForm, education: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm resize-none"
              rows="3"
              placeholder="Add your education background..."
            />
          </div>
        </>
      ) : (
        <>
          {profileData.experience && profileData.experience !== 'Add your experience' && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" />
                Experience
              </h3>
              <p className="text-gray-600 text-sm">{profileData.experience}</p>
            </div>
          )}
          {profileData.education && profileData.education !== 'Add your education' && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Education
              </h3>
              <p className="text-gray-600 text-sm">{profileData.education}</p>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
        
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-3 flex-shrink-0" />
          {isEditing ? (
            <input
              type="text"
              value={editForm.location}
              onChange={(e) => setEditForm({...editForm, location: e.target.value})}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm"
              placeholder="Your Location"
            />
          ) : (
            <span>{profileData.location}</span>
          )}
        </div>
        
        <div className="flex items-center text-gray-600">
          <Mail className="w-4 h-4 mr-3 flex-shrink-0" />
          <span>{profileData.email}</span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <Phone className="w-4 h-4 mr-3 flex-shrink-0" />
          {isEditing ? (
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm"
              placeholder="Phone Number"
            />
          ) : (
            <span>{profileData.phone}</span>
          )}
        </div>
 
        <div className="flex items-center text-gray-600">
          <Calendar className="w-4 h-4 mr-3 flex-shrink-0" />
          {isEditing ? (
            <select
              value={editForm.availability}
              onChange={(e) => setEditForm({...editForm, availability: e.target.value})}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm"
            >
              <option value="">Select Availability</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="freelance">Freelance</option>
              <option value="not-available">Not Available</option>
            </select>
          ) : (
            <span>Available {profileData.availability}</span>
          )}
        </div>
        
        <div className="flex items-center text-gray-600">
          <DollarSign className="w-4 h-4 mr-3 flex-shrink-0" />
          {isEditing ? (
            <input
              type="number"
              value={editForm.hourlyRate}
              onChange={(e) => setEditForm({...editForm, hourlyRate: e.target.value})}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm"
              placeholder="Hourly Rate"
            />
          ) : (
            <span>${profileData.hourlyRate}/hour</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;