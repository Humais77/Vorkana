import {BrowserRouter, Routes,Route} from 'react-router-dom';

import Home from './pages/Home';
import Footer from './layouts/Footer';
import Navbar from './layouts/Navbar';
import GigCreate from './layouts/pages/GigCreate';
import Signin from './layouts/pages/Signin';
import Signup from './layouts/pages/Signup';
import OAuthSuccess from './components/OAuthSuccess';
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { syncFromLocalStorage } from "./redux/slices/authSlice";

const App = () => {
   const dispatch = useDispatch();
  
  useEffect(() => {
    // Sync auth state when app loads
    dispatch(syncFromLocalStorage());
  }, [dispatch]);
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='create-gig' element={<GigCreate/>}/>
        <Route path='/sign-in' element={<Signin/>}/>
        <Route path='/sign-up' element={<Signup/>}/>
        <Route path='/oauth-success' element={<OAuthSuccess/>}/>
      </Routes>
      <Footer/>
    </BrowserRouter>
  )
}

export default App