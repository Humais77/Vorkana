// import {BrowserRouter, Routes,Route} from 'react-router-dom';

// import Home from './pages/Home';
// import Footer from './layouts/Footer';
// import Navbar from './layouts/Navbar';
// import GigCreate from './layouts/pages/GigCreate';
// import Signin from './layouts/pages/Signin';
// import Signup from './layouts/pages/Signup';
// import OAuthSuccess from './components/OAuthSuccess';
// import { useEffect } from "react";
// import { useDispatch } from "react-redux";
// import { syncFromLocalStorage } from "./redux/slices/authSlice";
// import GigDetails from './layouts/pages/GigDetails';

// const App = () => {
//    const dispatch = useDispatch();
  
//   useEffect(() => {
//     // Sync auth state when app loads
//     dispatch(syncFromLocalStorage());
//   }, [dispatch]);
//   return (
//     <BrowserRouter>
//       <Navbar/>
//       <Routes>
//         <Route path='/' element={<Home/>}/>
//         <Route path='/create-gig' element={<GigCreate/>}/>
//         <Route path= '/gig/:id' element={<GigDetails/>}/>
//         <Route path='/sign-in' element={<Signin/>}/>
//         <Route path='/sign-up' element={<Signup/>}/>
//         <Route path='/oauth-success' element={<OAuthSuccess/>}/>
//       </Routes>
//       <Footer/>
//     </BrowserRouter>
//   )
// }

// export default App
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import Footer from './layouts/Footer';
import Navbar from './layouts/Navbar';

// Pages
import Home from './layouts/Home';
import GigCreate from './layouts/pages/GigCreate';
import Signin from './layouts/pages/Signin';
import Signup from './layouts/pages/Signup';
import GigDetails from './layouts/pages/GigDetails';

// Components
import OAuthSuccess from './components/OAuthSuccess';

// Hooks
import { useAuthSync } from "./hooks/useAuthSync";
import CategoryPage from './layouts/pages/CategoryPage';
import GigListingsPage from './layouts/pages/GigListingPage';
import Profile from './layouts/pages/Profile';
import CreateService from './layouts/pages/CreateService';
import ServiceDetails from './layouts/pages/ServiceDetails';
import ScrollToTop from './components/ScrollToTop';

const App = () => {
  // Sync auth state when app loads (using Zustand)
  useAuthSync();

  return (
    <BrowserRouter>
    <ScrollToTop/>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/create-gig' element={<GigCreate />} />
        <Route path='/gig/:id' element={<GigDetails />} />
        <Route path='/sign-in' element={<Signin />} />
        <Route path='/sign-up' element={<Signup />} />
        <Route path='/oauth-success' element={<OAuthSuccess />} />
        <Route path='/categories/:categoryId' element={<CategoryPage/>}/>
        <Route path="/gigs" element={<GigListingsPage />} />
        <Route path='/profile' element={<Profile/>}/>
        <Route path="/services/create" element={<CreateService />} />
        <Route path='/profile/services' element={<Profile />} />
<Route path="/services/:id" element={<ServiceDetails />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
};

export default App;