import React from 'react';
import { Link } from 'react-router-dom';

export const Services = () => {
    return (
        <div className="flex flex-col md:flex-row h-[600px] p-5 m-6 bg-black gap-4 rounded-md border border-white !overflow-auto">
            <h1 className="font-bold text-xl">Our Services</h1>
            <p>
                At OutfitGen, we are dedicated to helping you look your best every day. Our services are designed to make fashion easy, accessible, and personalized for everyone.
            </p>
            <h2 className="font-semibold text-lg">What We Offer</h2>
            <ul>
                <li>
                    <strong>Personalized Outfit Recommendations:</strong> Get daily outfit suggestions tailored to your style, preferences, and the weather.
                </li>
                <li>
                    <strong>Wardrobe Management:</strong> Organize your closet digitally, track what you own, and discover new ways to combine your clothes.
                </li>
                <li>
                    <strong>Style Inspiration:</strong> Browse curated looks and trending styles to keep your wardrobe fresh and exciting.
                </li>
                <li>
                    <strong>Shopping Assistance:</strong> Receive recommendations for new pieces that match your style and fill gaps in your wardrobe.
                </li>
            </ul>
            <h2 className="font-semibold text-lg">Why Choose Us?</h2>
            <p>
                Our platform uses advanced algorithms and the latest fashion trends to provide you with the best outfit ideas. Whether you're dressing for work, a special occasion, or just a casual day out, OutfitGen has you covered.
            </p>
            <p>
                <Link to="/">Back to Home</Link>
            </p>
        </div>
    );
}
export default Services;