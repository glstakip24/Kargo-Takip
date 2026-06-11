import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'GLS Kargo Takip',short_name:'Kargo Takip',theme_color:'#0B3A78',background_color:'#EAF2FF',display:'standalone',start_url:'/',icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'}]}})]});
