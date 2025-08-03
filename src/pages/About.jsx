import React from 'react';
import {Link} from 'react-router-dom';

export const Aboutme = () => {
return (
    <div className="flex flex-col items-center justify-center gap-4 bg-black-100 mt-0 p-4">
        <h2 className="text-red-500 text-2xl font-bold">About Us</h2>
        <p className="text-white text-lg">
            We are dedicated to helping you find the perfect outfit for any occasion. 
            Our team of fashion experts curates the latest trends and timeless classics to ensure you always look your best.
        </p>
        <button className="max-w-[180px] h-[43px] bg-black text-white rounded-md transition-transform hover:scale-105 hover:bg-black-300">
            <Link to="/home" className="w-full h-full block font-bold text-center">Go back home</Link>
        </button>
    </div>
);
}
export default Aboutme;