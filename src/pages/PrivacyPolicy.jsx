import React from 'react';
import {Link} from "react-router-dom";
export const Privacy = () => {
    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
            <h1>Privacy Policy</h1>
            <p>
                Last updated: June 2024
            </p>
            <p>
                This Privacy Policy describes how we collect, use, and protect your information when you use our website.
            </p>
            <h2>Information We Collect</h2>
            <ul>
                <li>
                    <strong>Personal Information:</strong> We may collect your name, email address, and other information you provide when you contact us or use our services.
                </li>
                <li>
                    <strong>Usage Data:</strong> We may collect information about how you use our website, such as pages visited and actions taken.
                </li>
            </ul>
            <h2>How We Use Your Information</h2>
            <ul>
                <li>To provide and maintain our services</li>
                <li>To improve our website and user experience</li>
                <li>To communicate with you</li>
                <li>To comply with legal obligations</li>
            </ul>
            <h2>How We Protect Your Information</h2>
            <p>
                We implement reasonable security measures to protect your information from unauthorized access.
            </p>
            <h2>Third-Party Services</h2>
            <p>
                We may use third-party services for analytics or hosting. These services may collect information as described in their own privacy policies.
            </p>
            <h2>Changes to This Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page.
            </p>
            <h2>Contact Us</h2>
            <p>
                If you have any questions about this Privacy Policy, please contact us.
            </p>
            <Link to="/">Go back home</Link>
        </div>
    );
}
export default Privacy;