import React,{useState,useEffect} from 'react'
import {Button, CircularProgress} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile';
import toast from 'react-hot-toast'
import {useAuth} from './AuthContext'
import axios from "axios";
import closetimg from "../assets/closetimg.png"
import {store,db} from '../utils/firebase'
//import { collection, addDoc } from "firebase/firestore";
import {ref,uploadBytes, getDownloadURL} from 'firebase/storage'
import { Link } from 'react-router-dom';
import {cartoonImage} from '../utils/cartoon';
function Home(){
    const [file, setFile] = useState(null);
    const {user} = useAuth();
    const storage = store;
    const [prompt, setPrompt] = useState("");
    const [idea, setIdea] = useState("");
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const[category,setCategory]= useState('top');
    const [coords, setCoords] = useState(null);
    const BETA_NOTICE_MESSAGE = "⚠️ Beta Notice: This page is currently in beta and still under construction. Some features may be incomplete or not work as expected. We're actively improving it thank you for your patience!";
    const info = () => {
      if (!sessionStorage.getItem("betaNoticeShown")) {
        alert(BETA_NOTICE_MESSAGE);
        sessionStorage.setItem("betaNoticeShown", "true");
      }
    }
    useEffect(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
            toast.error("Location access denied. Defaulting to London.");
          }
        );
      } else {
        toast.error("Geolocation not supported.");
      }
    }, []);
    useEffect(() => {
      info();
    }, []);
    const handleGenerate = async () => {
      if (!prompt.trim()) return;
  
      setLoading(true);
      setError("");
      setIdea("");

      try {
        if(!user||!user.uid){
          setError("Please log in to use this feature.");
          return;
        }
        const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/generate-outfit-from-closet`, {
          userId:user && user.uid ? user.uid : null,  // dynamically pull this from auth or localStorage
          lat: coords?.lat ?? null,
          lon: coords?.lon ?? null,
          prompt,
        });
        setIdea(res.data.outfit_idea);
      } catch (err) {
        console.error("Error:", err);
        setError("Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    }
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };
    const handleUploadAndCartoon = async () => {

        if (!file) {
          toast.error("No file selected");
          return;
        }
        if(!category){
            toast.error("Please select a clothing category.");
            return;
        }
        if (!user || !user.uid) {
          toast.error("You must be logged in to upload outfits.");
          return;
        }
        setLoadingUpload(true);
        await new Promise((r) => setTimeout(r, 50)); // tiny delay to let UI update
        try {  // Replace with dynamic city if you want

          const safeFileName = file.name.replace(/\s+/g, "_");
          const userImageRef = ref(storage, `users/${user.uid}/${category}/${safeFileName}`);
      
          await uploadBytes(userImageRef, file);
          const downloadUrl = await getDownloadURL(userImageRef);
          console.log("Original uploaded:", downloadUrl);
      
          const data = await cartoonImage(file, user.uid, downloadUrl, category, coords?.lat, coords?.lon);
      
          if (data.cartoonUrl) {
            toast.success("Outfit uploaded & stylized successfully!");
            setFile(null);
          } else {
            toast.error("Stylized version failed to generate.");
          }
      
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("An error occurred during upload.");
        }
        finally{
          setLoadingUpload(false);
        }
      }; 
      const closett = () =>{
        alert('page under construction');
      }     
    return(
        <div className="flex flex-col bg-black w-full h-[75vh]">
            <div className="flex flex-col md:flex-row h-[600px] p-5 m-6 bg-black gap-4 rounded-md border border-white !overflow-auto">
                <section className="bg-white text-black rounded-md p-4 max-w-[200px] justify-center items-center text-center">
                    <label htmlFor="upload-input">
                    <input
                    type="file"
                    id="upload-input"
                    accept="image/*"
                    capture="environment"
                    name="upload"
                    hidden
                    onChange={handleFileChange}
                    />
                    <Button
                    variant="contained"
                    component="span"
                    fullWidth
                    >
                    <UploadFileIcon sx={{ fontSize: 24 }} />
                    Upload Outfit
                    </Button>
                    </label>
                    {file && (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full h-auto mt-2 rounded"
                      />
                    )}
                    <select onChange={(e)=>setCategory(e.target.value)} className="text-white">
                        <option value='' disabled selected>select an option</option>
                        <optgroup label="👕 Tops">
                        <option value='top'>Top</option>
                        <option value='hoodies'>Hoodies</option>
                        <option value='coat'>Coat</option>
                        </optgroup>
                        <optgroup label='👖 Bottom'>
                        <option value='trouser'>Trouser</option>
                        <option value='short'>Short</option>
                        </optgroup>
                        <optgroup label="🧢 Accessories">
                        <option value='cap'>Cap</option>
                        </optgroup>
                    </select>
                    <Button
                      onClick={handleUploadAndCartoon}
                      disabled={loadingUpload}
                      startIcon={loadingUpload ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                      {loadingUpload ? "Uploading" : "Submit"}
                    </Button>
                </section>
                <section className="max-w-sm top-20 ml-6 bg-white text-black rounded-md p-2 -translate-x-8 ">
                    <Link to='/closet'>
                        <img src={closetimg}></img>
                        <h1 className="font-bold text-[30px] text-center">Closet</h1>
                    </Link>
                </section> 
                <section className="max-w-sm top-20 ml-6 bg-white text-black rounded-md p-2 -translate-x-8 ">
                    <Link to='/'>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring focus:ring-black"
                        placeholder="What should I wear to a beach party?"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                      />
                      <Button
                        onClick={handleGenerate}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                      >
                        {loading ? "Generating..." : "Get Outfit Idea"}
                      </Button>
                      {idea && (
                        <div className="mt-6 bg-gray-100 p-4 rounded-lg shadow-sm border text-gray-700">
                          <h2 className="font-semibold mb-2">Idea:</h2>
                          <p>{idea}</p>
                        </div>
                      )}

                      {error && <p className="text-red-500 mt-4">{error}</p>}
                        <h1 className="font-bold text-[30px] text-center">Ai Generated Fashion Idea</h1>
                    </Link>
                </section> 
            </div>           
        </div>
    )
}
export default Home;