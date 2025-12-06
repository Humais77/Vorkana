import {BrowserRouter, Routes,Route} from 'react-router-dom';

import Home from './pages/Home';
import Footer from './layouts/Footer';
import Navbar from './layouts/Navbar';
import GigCreate from './layouts/pages/GigCreate';
import Signin from './layouts/pages/Signin';
import Signup from './layouts/pages/Signup';


const App = () => {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='create-gig' element={<GigCreate/>}/>
        <Route path='/sign-in' element={<Signin/>}/>
        <Route path='/sign-up' element={<Signup/>}/>
      </Routes>
      <Footer/>
    </BrowserRouter>
  )
}

export default App