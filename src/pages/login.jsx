import React, {useState } from "react";
import { Link , useNavigate} from "react-router-dom";
import {toast} from 'react-hot-toast';
import { auth } from "../utils/firebase";
import { GoogleIcon,AppleIcon } from "../components/customIcons";
import { signInWithEmailAndPassword,GoogleAuthProvider,GithubAuthProvider,signInWithPopup } from "firebase/auth";
//import { auth } from "./firebase";
//import { createUserWithEmailAndPassword } from "firebase/auth";
import '../index.css';
//import { useState } from "react";
export const Login = ()=> {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error,setError] = useState('');
    const navigate = useNavigate();
  const handleLogin = async(e)=> {
    e.preventDefault();
    if(!email||!password){
      setError('please input the details above !');
      toast.error('fill the input to login.');
      return;
    }
    setError(''); 
    await loggedIn();
  }
  const loggedIn = async()=>{
    try{
      const result = await signInWithEmailAndPassword(auth, email, password);
      //console.log ('logging in :',result.user.email);
      toast.success('login sucessful');
      navigate('/home');
    }catch (err){
      console.error(err);
      toast.error(err.message);
    }
  }
  const googleUp = async()=>{
    const provider = new GoogleAuthProvider();
    try{
      const userGoogleCredential = await signInWithPopup(auth,provider);
      //console.log('user logged in :',userGoogleCredential.user);
      toast.success('login successful');
      navigate('/home');
    }catch(err){
      console.error(err);
      toast.error(err.message);
    }
  }
  const githubUp = async()=>{
    const githubProvider = new GithubAuthProvider();
    try{
      const userGithubCredential = await signInWithPopup(auth,githubProvider);
      //console.log('user logged in :',userGithubCredential.user);
      toast.success('login successful');
      navigate('/home');
    }catch(err){
      console.error(err);
      toast.error(err.message);
    }
  }
  return (
    <div className="max-w-sm mx-auto p-4 bg-black border border-gray-600 rounded-xl shadow-md mt-10">
      <h1 className="text-center  text-2xl font-bold">Login Page</h1>
      <form className="space-y-2" onSubmit={handleLogin}>
        <label className="text-sm font-bold ">
          Email:
          <input type="mail"
           name="Email"
           placeholder="email"
           value={email}
           onChange={(e)=>setEmail(e.target.value)}
           className="mt-1 block w-full border px-3 py-2 rounded-md bg-transparent text-white"
            />
        </label>
        <br />
        <label className="text-sm font-bold">
          Password:
          <input type="password"
           name="password"
           placeholder="password"
           value={password}
           onChange={(e)=>setPassword(e.target.value)}
           className="mt-1 block w-full border px-3 py-2 rounded-md bg-transparent text-white"
            />
        </label>
        <br />
        {error && <p className="text-red-500">{error}</p>}
        <button 
            type="submit"
            className="w-full bg-green-600 border border-gray-200 text-white py-2 rounded-md hover:bg-blue-700">
            {/* <Link to="/home">*/}Login{/*</Link>*/}
        </button>
        <button 
          onClick={googleUp}
          className="flex items-center justify-center w-full border border-gray-600 py-2 rounded-md hover:bg-gray-800"
        ><GoogleIcon className='mr-2'/>Sign In With Google</button>
        <button 
          onClick={githubUp}
          className="flex items-center justify-center w-full border border-gray-600 py-2 rounded-md hover:bg-gray-800"
        ><AppleIcon className='mr-2'/>Sign In With Github</button>
        <p className="mt-4 text-sm text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
export default Login;