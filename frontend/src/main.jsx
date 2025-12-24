import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Production'da backend URL'sini ayarla
// Development'ta Vite proxy kullanılır
if (import.meta.env.PROD) {
    // Production: aynı sunucuda backend port 5000'de
    axios.defaults.baseURL = window.location.protocol + '//' + window.location.hostname + ':5000'
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

