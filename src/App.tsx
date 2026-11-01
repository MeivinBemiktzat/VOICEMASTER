import { Routes,Route,Navigate,useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home"; import AudioEditor from "./pages/AudioEditor"; import Contact from "./pages/Contact"; import Music from "./pages/Music"; import Narration from "./pages/Narration"; import Podcast from "./pages/Podcast"; import About from "./pages/About"; import Settings from "./pages/Settings"; import AuthPage from "./pages/Auth"; import Admin from "./pages/Admin"; import Updates from "./pages/Updates";
import { useAuth } from "./lib/AuthContext";

function SettingsAccess() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="py-16 text-center text-sm text-mute">טוען...</div>;
  if (!user) return <Navigate to="/login" replace state={{ fromSettings: true, from: location.pathname }} />;
  return <Settings />;
}

export default function App(){return <Routes><Route element={<Layout />}><Route path="/" element={<Home/>}/><Route path="/narration" element={<Narration/>}/><Route path="/editor" element={<AudioEditor/>}/><Route path="/podcast" element={<Podcast/>}/><Route path="/settings" element={<SettingsAccess/>}/><Route path="/about" element={<About/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/admin" element={<Admin/>}/><Route path="/updates" element={<Updates/>}/><Route path="/contact" element={<Contact/>}/><Route path="*" element={<Home/>}/></Route></Routes>;}