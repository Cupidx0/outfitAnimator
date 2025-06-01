import React, {useState} from 'react';
import '../index.css';
import {toast} from 'react-hot-toast';
//import { FaGoogle } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { auth} from '../utils/firebase';
import { GoogleIcon,AppleIcon, FacebookIcon, SitemarkIcon } from '../components/customIcons';
import { GoogleAuthProvider,GithubAuthProvider,createUserWithEmailAndPassword,signInWithPopup} from 'firebase/auth';
export const SignUp =()=>{
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const handleSignup = async(e)=>{
      e.preventDefault();
      if(!firstName||!lastName||!email||!password||!confirmPassword){
        setError("please fill in your details !");
        toast.error('please fill in your details!');
        return;
      }else if(password != confirmPassword){
        setError("passwords does not match!");
        toast.error('passwords does not match!');
      }
      setError("");
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User created:", userCredential.user.email);
        toast.success("Signup successful!");
        navigate('/home');
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      }
    };
    const googleUp = async()=>{
      const provider = new GoogleAuthProvider();
      try {
        const userGoogleCredential = await signInWithPopup(auth,provider);
        //console.log("User created:", userGoogleCredential.user);
        toast.success("Signup successful!");
        navigate('/home');
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      }
    };
    const githubUp = async()=>{
      const githubProvider = new GithubAuthProvider();
      try{
        const userGithubCredential = await signInWithPopup(auth,githubProvider);
        //console.log("user created :", userGithubCredential.user);
        toast.success("Signup successful!");
        navigate('/home');
      }catch (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // You might also get email or credential depending on the error
        const email = error.email; // For account-exists-with-different-credential
        const credential = error.credential; // The GitHub credential for linking
    
        // Check if the error is the specific account-exists-with-different-credential error
        if (errorCode === 'auth/account-exists-with-different-credential') {
          console.warn('Account exists with a different credential:', email);
          //console.log('Pending GitHub credential:', credential);
          toast.error(`An account with this email already exists. Please sign in with your existing method to link your GitHub account.`);
    
          // Important: Do NOT navigate away or proceed as if the user is signed in
          // until the linking process (steps B and C above) is complete.
    
        } else {
          // Handle other errors (network issues, incorrect credentials for a new account, etc.)
          console.error("Authentication Error:", error);
          toast.error(errorMessage); // Show the generic error message for other errors
        }
      }
    }
    return(
        <div className="max-w-[300px] max-h-[500px] text-white mx-auto p-3 bg-black border border-gray-700 rounded-md shadow-md mb-6 mt-0 overflow-scroll">
      <h2 className="text-xl text-center font-bold mb-4">Create An Account</h2>
      <form  className="space-y mb-1 bg-transparent" onSubmit={handleSignup}>
        <div>
          <label htmlFor='firstname' className="block text-sm font-medium">First Name</label>
          <input
            type="text"
            name="firstname"
            placeholder="First Name"
            value = {firstName}
            onChange ={(e)=> setFirstName(e.target.value)}
            className="mt-1 block w-full max-w-md border px-3 py-2 rounded-md bg-transparent text-white sm:max-w-sm"
          />
        </div>
        <div>
          <label htmlFor='lastname' className="block text-sm font-medium">Last Name</label>
          <input
            type="text"
            name="lastname"
            placeholder="Last Name"
            value = {lastName}
            onChange = {(e)=> setLastName(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded-md bg-transparent text-white"
          />
        </div>
        <div>
          <label htmlFor='email' className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value = {email}
            onChange = {(e)=>setEmail(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded-md bg-transparent text-white"
          />
        </div>
        <div>
          <label htmlFor='password' className="block text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value = {password}
            onChange = {(e)=>setPassword(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded-md bg-transparent text-white"
          />
          <label htmlFor='confirmpassword' className="block text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value = {confirmPassword}
            onChange = {(e)=>setConfirmPassword(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 mb-1 bg-transparent rounded-md text-white"
          />
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <div className='text-center max-w-sm'>
          <button
            type="submit"
            className="w-full border border-gray-600 bg-green-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Sign Up
          </button>

          <button 
            onClick={googleUp}
            className="flex items-center justify-center w-full border border-gray-600 py-2 rounded-md hover:bg-gray-800"
            ><GoogleIcon className='mr-2'/>Sign In With Google</button>
          <button 
          onClick={githubUp}
          className="flex items-center justify-center w-full border border-gray-600 py-2 rounded-md hover:bg-gray-800"
          ><AppleIcon className='mr-2'/>Sign In With Github</button>
          <p className="mt-4 text-sm  text-center">
          Already have an account?{' '}
          <Link to ="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </p>
        </div>
      </form>
    </div>
    )
}
export default SignUp