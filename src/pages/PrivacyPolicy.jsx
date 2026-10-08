import React from 'react';
import { ContactLink } from './Footer';

export const Privacy = () => {
  return (
    <article className="doc">
      <h1>Privacy policy</h1>
      <p className="text-muted">Last updated: October 2026</p>
      <p>
        This Privacy Policy describes how we collect, use, and protect your information when you use our website.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> Your name, email address, and, if you sign in with Google or GitHub, the basic profile those services share with us.</li>
        <li><strong>Clothing photos:</strong> Photos you upload to your closet, a stylized version of each, and the main colours we detect in them.</li>
        <li><strong>Outfit requests:</strong> The text you type when asking for an outfit idea, and the ideas and images we generate.</li>
        <li><strong>Approximate location:</strong> If you allow it, your browser's location is used to look up the local weather. We do not store it.</li>
        <li><strong>Usage data:</strong> Information about how you use our website, such as pages visited and actions taken.</li>
      </ul>
      <h2>How we use your information</h2>
      <ul>
        <li>To provide and maintain our services, including outfit suggestions based on your closet and the weather</li>
        <li>To improve our website and user experience</li>
        <li>To communicate with you</li>
        <li>To comply with legal obligations</li>
      </ul>
      <h2>Third-party services</h2>
      <p>To run OutfitGen we share data with these providers, each under its own privacy policy:</p>
      <ul>
        <li><strong>Google Firebase:</strong> sign in, and storage of your account, closet items and photos.</li>
        <li><strong>Replicate:</strong> receives your clothing photos to create the stylized versions.</li>
        <li><strong>OpenAI:</strong> receives your outfit requests and a text description of your closet to write outfit ideas and generate images.</li>
        <li><strong>OpenWeather:</strong> receives your approximate location, or a city name, to return the current weather.</li>
        <li><strong>Vercel:</strong> hosts the website.</li>
      </ul>
      <h2>How we protect your information</h2>
      <p>
        We implement reasonable security measures to protect your information from unauthorized access. Your original photos are private.
        Stylized images are stored at hard-to-guess public web addresses so they can be displayed.
      </p>
      <h2>Deleting your data</h2>
      <p>
        Removing an item from your closet deletes its record, the original photo, and the stylized image. To delete your account, <ContactLink />.
      </p>
      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page.
      </p>
      <h2>Contact us</h2>
      <p>
        If you have any questions about this Privacy Policy, please <ContactLink />.
      </p>
    </article>
  );
}
export default Privacy;
