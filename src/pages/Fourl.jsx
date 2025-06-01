import React from "react"
import {Link}  from "react-router-dom"
import underconstruction from '../assets/underconstruction.jpeg'
function Four(){
    return(
        <div className="flex flex-col items-center justify-center gap-1 bg-black-100 mt-0">
            <h2 className="text-red-500">
                <img src={underconstruction}
                 className="w-[300px] h-auto rounded-xl"></img>
            </h2>
            <button className="max-w-[180px] h-[43px] bg-black text-white rounded-md transition-transform hover:scale-105 hover:bg-black-300">
                <Link to = "/home" className="w-full h-full block font-bold text-center">Go back home</Link>
            </button>
        </div>
    )
}
export default Four;