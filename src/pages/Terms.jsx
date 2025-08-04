import React from 'react';
import {Link} from "react-router-dom";

export const Terms = () => {
    return (
        <div className="flex flex-col md:flex-row h-[600px] p-5 m-6 bg-black gap-4 rounded-md border border-white !overflow-auto">
            <h1>Terms and Conditions</h1>
            <p>
                Welcome to OutfitGen. By accessing or using our website, you agree to be bound by these Terms and Conditions. Please read them carefully.
            </p>
            <h2>1. Use of Service</h2>
            <p>
                You may use this site for personal, non-commercial purposes only. Do not misuse our services or attempt to access them using a method other than the interface provided.
            </p>
            <h2>2. Intellectual Property</h2>
            <p>
                All content, trademarks, and data on this site are the property of OutfitGen or its licensors. You may not copy, reproduce, or distribute any content without permission.
            </p>
            <h2>3. Limitation of Liability</h2>
            <p>
                OutfitGen is not liable for any damages or losses resulting from your use of this site.
            </p>
            <h2>4. Changes to Terms</h2>
            <p>
                We may update these Terms from time to time. Continued use of the site means you accept the new Terms.
            </p>
            <h2>5. Contact</h2>
            <p>
                If you have any questions about these Terms, please <Link to="/contact">contact us</Link>.
            </p>
        </div>
    );
}
export default Terms;