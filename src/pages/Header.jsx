import React from 'react'
import '../index.css'
import {Link} from 'react-router-dom'
function Header(){
    return(
        <header>
            <div className="content">
                <Link to="/home" className="text-white">
                    <h2 className="font-bold text-2xl">FitGen</h2>
                </Link>
            </div>
        </header>
    );
}
export default Header;