import React from 'react';
import { Link } from "react-router-dom";
import { SIGNUPS_OPEN } from '../utils/firebase';
import { ContactLink } from './Footer';

export const Faq = () => {
  return (
    <article className="doc">
      <h1>Frequently asked questions</h1>

      <h2>What is OutfitGen?</h2>
      <p>OutfitGen is a platform that helps you create and manage your wardrobe, providing outfit suggestions based on your clothing items.</p>

      <h2>How do I create an account?</h2>
      {SIGNUPS_OPEN ? (
        <p>Go to the <Link to="/signup">sign up page</Link> and fill out the registration form.</p>
      ) : (
        <p>New sign ups are temporarily closed. Existing accounts can still <Link to="/login">log in</Link>.</p>
      )}

      <h2>How do I log in?</h2>
      <p>Go to the <Link to="/login">log in page</Link> and enter your email and password, or continue with Google or GitHub.</p>

      <h2>How do I reset my password?</h2>
      <p>On the log in page, enter your email and choose "Forgot password?". We'll email you a reset link.</p>

      <h2>How do I contact support?</h2>
      <p>If you have any questions or need help, <ContactLink>email our support team</ContactLink>.</p>
    </article>
  );
}
export default Faq;
