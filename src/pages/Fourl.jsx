import React from "react"
import { Link } from "react-router-dom"

function Four() {
  return (
    <div className="mx-auto flex max-w-prose flex-col items-center gap-4 py-12 text-center">
      <p className="font-medium text-muted">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  )
}
export default Four;
