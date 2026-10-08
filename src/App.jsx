import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './pages/Layoutt.jsx'
import Home from './pages/Home.jsx'

// Everything except the home page loads on demand to keep the first download small.
const Four = lazy(() => import('./pages/Fourl.jsx'))
const Fashion = lazy(() => import('./pages/Closet.jsx'))
const Login = lazy(() => import('./pages/login.jsx'))
const SignUp = lazy(() => import('./pages/signup.jsx'))
const Services = lazy(() => import('./pages/Services.jsx'))
const Aboutme = lazy(() => import('./pages/About.jsx'))
const Privacy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Faq = lazy(() => import('./pages/Faq.jsx'))

const page = (element) => (
  <Suspense fallback={<div className="skeleton h-[240px]" aria-busy="true" aria-label="Loading page" />}>
    {element}
  </Suspense>
)

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout/>}>
          <Route index element={<Home/>}/>
          <Route path="/home" element={<Home/>}/>
          <Route path="/closet" element={page(<Fashion/>)}/>
          <Route path="/signup" element={page(<SignUp/>)}/>
          <Route path="/login" element={page(<Login/>)}/>
          <Route path="/services" element={page(<Services/>)}/>
          <Route path="/about" element={page(<Aboutme/>)}/>
          <Route path="/privacy" element={page(<Privacy/>)}/>
          <Route path="/terms" element={page(<Terms/>)}/>
          <Route path="/faq" element={page(<Faq/>)}/>
          <Route path="*" element={page(<Four/>)}/>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
