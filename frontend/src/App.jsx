import {BrowserRouter, Routes,Route} from 'react-router-dom';
import Navbar from './Layouts/Navbar';
import Home from './pages/Home';
import Footer from './Layouts/Footer';

const App = () => {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>}/>
      </Routes>
      <Footer/>
    </BrowserRouter>
  )
}

export default App