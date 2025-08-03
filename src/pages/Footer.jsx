import React from 'react';
import '../index.css';
import {FaFacebook} from 'react-icons/fa';
import {FaTwitter} from 'react-icons/fa';
import {FaInstagram} from 'react-icons/fa';
import { Link } from 'react-router-dom';
function Footer(){
    const date = new Date().getFullYear();
    return (    <footer className="absolute bottom-0 w-full bg-black text-white py-5 px-4">
        <div className=" max-w-7xl mx-auto flex flex-col md:flex-row md:justify-center gap-2">
            {/* Navigation Columns */}
            <div className="flex flex-wrap gap-8 w-full md:w-auto justify-between text-sm">
                {/* Column 1 */}
                <nav>
                    <ul className="space-y-2">
                        <li className="hover:text-blue-500 transition-transform hover:scale-105">
                            <Link to="/home">Home</Link>
                        </li>
                        <li className="hover:text-blue-500 transition-transform hover:scale-105">
                            <Link to="/services">Services</Link>
                        </li>
                        <li className="hover:text-blue-500 transition-transform hover:scale-105">
                            <a href="/j">Products</a>
                        </li>
                    </ul>
                </nav>
                {/* Column 2 */}
                <nav>
                    <ul className="space-y-2">
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <Link to="/about">About</Link>
                      </li>
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <a href="/contact">Contact</a>
                      </li>
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <Link to="/privacy">Privacy Policy</Link>
                      </li>
                    </ul>
                </nav>
                {/* Column 3 */}
                <nav>
                    <ul className="space-y-2">
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <Link to="/terms">Terms</Link>
                      </li>
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <Link to="/faq">FAQ</Link>
                      </li>
                      <li className="hover:text-blue-500 transition-transform hover:scale-105">
                        <Link to="/signup">Sign Up</Link>
                      </li>
                    </ul>
                </nav>
            </div>
        </div>
        {/* Copyright */}
        <div className="mt-6 text-center text-xs text-gray-400">
            &copy; {date} Godwin Ltd. All rights reserved.
        </div>
    </footer>
    )
}
export default Footer;