import React from 'react'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6 md:py-12">
        <Outlet />
      </main>
      <Footer />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            fontSize: '16px',
          },
        }}
      />
    </div>
  );
}

export default Layout;
