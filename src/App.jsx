import React from 'react'
import Layout from './pages/Layoutt.jsx'
import './index.css'
import Four from './pages/Fourl.jsx'
import Fashion from './pages/Closet.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/login.jsx'
import SignUp from './pages/signup.jsx'
import Services from './pages/Services.jsx'
import About from './pages/About.jsx'
import Privacy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import Faq from './pages/Faq.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
function App() {
  return (
    <>
     <Router>
          <Routes>
            <Route path="/" element={<Layout/>}>
              <Route index element={<Home/>}/>
              <Route path="/home" element ={<Home/>}/>
              <Route path="/closet" element ={<Fashion/>}/>
              <Route path="/signup" element ={<SignUp/>}/>
              <Route path="/login"  element ={<Login/>}/>
              <Route path="/services" element={<Services/>} />
              <Route path="/about" element={<About/>} />
              <Route path="/privacy" element={<Privacy/>} />
              <Route path="/terms" element={<Terms/>} />
              <Route path="/faq" element={<Faq/>}/>
              <Route path="*" element={<Four/>} />
            </Route>
          </Routes>
      </Router>
    </>
  )
}

export default App
