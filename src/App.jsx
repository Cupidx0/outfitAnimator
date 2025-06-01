import React from 'react'
import Layout from './pages/Layoutt.jsx'
import './index.css'
import Four from './pages/Fourl.jsx'
import Fashion from './pages/Closet.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/login.jsx'
import SignUp from './pages/signup.jsx'
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
              <Route path="*" element={<Four/>} />
            </Route>
          </Routes>
      </Router>
    </>
  )
}

export default App
