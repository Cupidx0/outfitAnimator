import React from 'react';
import {Link} from "react-router-dom";

export const Faq = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-black-100 mt-0 p-4">
      <h2 className="text-red-500 text-2xl font-bold">Frequently Asked Questions (FAQ)</h2>
      <div className="max-w-md w-full bg-black text-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">What is OutfitGen?</h3>
        <p className="mb-4">OutfitGen is a platform that helps you create and manage your wardrobe, providing outfit suggestions based on your clothing items.</p>
        
        <h3 className="text-lg font-semibold mb-2">How do I create an account?</h3>
        <p className="mb-4">You can create an account by clicking on the <Link to="/signup">Sign Up</Link> button and filling out the registration form.</p>
        <h3 className="text-lg font-semibold mb-2">How do I log in?</h3>
        <p className="mb-4">To log in, click on the <Link to="/login">Log In</Link> button and enter your credentials.</p>
        <h3 className="text-lg font-semibold mb-2">How do I reset my password?</h3>
        <p className="mb-4">If you forget your password, you can reset it by clicking on the "Forgot Password" link on the login page.</p>
        
        <h3 className="text-lg font-semibold mb-2">How do I contact support?</h3>
        <p>If you have any questions or need assistance, you can contact our support team via the "Contact" page.</p>
      </div>
      <button className="max-w-[180px] h-[43px] bg-black text-white rounded-md transition-transform hover:scale-105 hover:bg-black-300">
        <Link to="/home" className="w-full h-full block font-bold text-center">Go back home</Link>
      </button>
    </div>
  );
}
export default Faq;