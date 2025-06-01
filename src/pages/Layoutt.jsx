import React, { useState } from 'react'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import '../index.css'
function Layout() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Header isOpen={isOpen} setIsOpen={setIsOpen} />
      <main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 1500,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default Layout;

