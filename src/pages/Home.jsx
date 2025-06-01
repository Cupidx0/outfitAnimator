import React,{useState} from 'react'
import {Button} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile';
import toast from 'react-hot-toast'
import {useAuth} from './AuthContext'
import {store,db} from '../utils/firebase'
//import { collection, addDoc } from "firebase/firestore";
import {ref,uploadBytes, getDownloadURL} from 'firebase/storage'
import { Link } from 'react-router-dom';
import {cartoonImage} from '../utils/cartoon';
function Home(){
    const [file, setFile] = useState(null);
    const {user} = useAuth();
    const storage = store;
    const[category,setCategory]= useState('top');
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
      
        try {
          const safeFileName = file.name.replace(/\s+/g, "_");
          const userImageRef = ref(storage, `users/${user.uid}/${category}/${safeFileName}`);
      
          await uploadBytes(userImageRef, file);
          const downloadUrl = await getDownloadURL(userImageRef);
          console.log("Original uploaded:", downloadUrl);
      
          const data = await cartoonImage(file, user.uid, downloadUrl, category);
      
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
                    <select onChange={(e)=>setCategory(e.target.value)} className="text-white">
                        <option value='' disabled selected>select an option</option>
                        <optgroup label="👕 Tops">
                        <option value='top'>Top</option>
                        <option value='hoodies'>Hoodies</option>
                        <option value='coat'>Coat</option>
                        </optgroup>
                        <optgroup label='👖 Bottom'>
                        <option value='trouser'>Trouser</option>
                        </optgroup>
                        <optgroup label="🧢 Accessories">
                        <option value='cap'>Cap</option>
                        </optgroup>
                    </select>
                    <Button
                    onClick={handleUploadAndCartoon}
                    >
                        submit
                    </Button>
                </section>
                <section className="max-w-sm top-20 ml-6 bg-white text-black rounded-md p-2 -translate-x-8 ">
                    <Link to='/closet'>
                        <img src="https://i.pinimg.com/736x/f6/60/ba/f660ba31eaf6c12fb8975dbe19d40dca.jpg"></img>
                        <h1 className="font-bold text-[30px] text-center">Closet</h1>
                    </Link>
                </section> 
                <section className="max-w-sm top-20 ml-6 bg-white text-black rounded-md p-2 -translate-x-8 ">
                    <Link to='/'>
                        <input
                         type="text"
                         placeholder="type in a prompt"
                         className="rounded-md text-center text-white"
                         ></input>
                         <Button
                         onClick={closett}
                            >
                                generate
                            </Button>
                        <h1 className="font-bold text-[30px] text-center">Ai Generated Fashion Idea</h1>
                    </Link>
                </section> 
            </div>           
        </div>
    )
}
export default Home;