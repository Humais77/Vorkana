// import React, { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { CheckCircle } from "lucide-react";
// import { useDispatch } from "react-redux";

// const OAuthSuccess = () => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   useEffect(() => {
//     // Get data from URL
//     const urlParams = new URLSearchParams(window.location.search);
//     const encodedData = urlParams.get('data');
    
//     if (encodedData) {
//       try {
//         const data = JSON.parse(decodeURIComponent(encodedData));
        
//         if (data.token && data.user) {
//           // Store data in the format that authSlice expects
//           localStorage.setItem("userInfo", JSON.stringify(data.user));
//           localStorage.setItem("userToken", data.token);
          
//           // Dispatch an action to update Redux state
//           // You might need to create this action in your authSlice
//           // For now, we'll trigger a page reload to sync state
//           setTimeout(() => {
//             // Navigate to create-gig
//             navigate("/create-gig");
//             // Reload the page to sync auth state
//             window.location.reload();
//           }, 1000);
//         } else {
//           navigate("/login?error=invalid_data");
//         }
//       } catch (error) {
//         console.error("Error parsing OAuth data:", error);
//         navigate("/login?error=parse_error");
//       }
//     } else {
//       navigate("/login?error=no_data");
//     }
//   }, [navigate]);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
//       <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
//         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
//           <CheckCircle className="w-12 h-12 text-green-600" />
//         </div>
//         <h1 className="text-3xl font-bold text-gray-900 mb-4">
//           Successfully Logged In!
//         </h1>
//         <p className="text-gray-600 mb-8">
//           Redirecting you to create a gig...
//         </p>
//         <div className="w-24 h-1 bg-blue-600 rounded-full mx-auto animate-pulse"></div>
//       </div>
//     </div>
//   );
// };

// export default OAuthSuccess;
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get data from URL
        const urlParams = new URLSearchParams(window.location.search);
        const encodedData = urlParams.get('data');
        
        if (!encodedData) {
          throw new Error('No OAuth data received');
        }

        const data = JSON.parse(decodeURIComponent(encodedData));
        
        if (data.token && data.user) {
          // Update auth state using Zustand
          setAuth(data.user, data.token);
          
          // Navigate to create-gig after a short delay
          setTimeout(() => {
            navigate("/create-gig");
          }, 1000);
        } else {
          throw new Error('Invalid OAuth data');
        }
      } catch (error) {
        console.error("Error processing OAuth callback:", error);
        navigate(`/sign-in?error=${encodeURIComponent(error.message)}`);
      }
    };

    handleOAuthCallback();
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Successfully Logged In!
        </h1>
        <p className="text-gray-600 mb-8">
          Setting up your account...
        </p>
        <div className="w-24 h-1 bg-blue-600 rounded-full mx-auto animate-pulse"></div>
      </div>
    </div>
  );
};

export default OAuthSuccess;