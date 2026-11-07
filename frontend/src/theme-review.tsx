// Temporary, isolated visual QA entry. All records below are explicitly synthetic.
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './services/theme';
import DashboardPage from './pages/dashboard/DashboardPage';
import CreateImagePage from './pages/create/CreateImagePage';
import LibraryPage from './pages/library/LibraryPage';
import HistoryPage from './pages/history/HistoryPage';
import AccountSettingsPage from './pages/settings/AccountSettingsPage';
import ImageDetailPage from './pages/detail/ImageDetailPage';
import artwork from './assets/auth/login-aurora.png';
import './index.css';

const id = '000000000000000000000001';
const image = { id, generationId:id, title:'Ảnh minh họa QA — không phải ảnh tài khoản', prompt:'Mô tả mẫu để kiểm tra màu và chữ.', createdAt:'2026-11-07T00:00:00Z', width:1024, height:1536, format:'png', bytes:100000, contentUrl:artwork, downloadUrl:artwork, model:'FLUX.1 Schnell', isFavorite:false };
const job = { id, prompt:'Dữ liệu QA: thế giới dưới đại dương', status:'succeeded', model:'FLUX.1 Schnell', createdAt:'2026-11-07T00:00:00Z', startedAt:'2026-11-07T00:00:00Z', completedAt:'2026-11-07T00:00:03Z', durationMs:3000, imageId:id, error:null };
window.fetch = async (input) => {
  const path = String(input).split('?')[0];
  let data: unknown;
  if(path.endsWith('/auth/me')) data={user:{id,displayName:'Tài khoản QA',email:'qa@example.invalid',createdAt:'2026-11-07T00:00:00Z'}};
  else if(path.endsWith('/usage/me')) data={grantedToday:5,acceptedToday:1,remainingToday:4,resetAt:'2026-11-08T00:00:00Z',configured:false};
  else if(path.endsWith('/stats/me')) data={totals:{savedImages:1,bytes:100000},averageDurationMs:3000,jobsByDay:[],jobsByStatus:[]};
  else if(path.endsWith('/images')) data={items:[image],nextCursor:null};
  else if(path.endsWith('/images/'+id)) data=image;
  else if(path.endsWith('/generations')) data={items:[job,{...job,id:'000000000000000000000002',status:'failed',imageId:null,error:{code:'QA',message:'Lỗi mẫu để kiểm tra hiển thị.'}}],nextCursor:null};
  else throw new Error('QA: thao tác này không được mô phỏng.');
  return new Response(JSON.stringify({success:true,data}),{headers:{'Content-Type':'application/json'}});
};
const page = new URLSearchParams(location.search).get('page');
const routes = {create:<CreateImagePage />,library:<LibraryPage />,history:<HistoryPage />,settings:<AccountSettingsPage />,detail:<ImageDetailPage imageId={id} />,dashboard:<DashboardPage />};
createRoot(document.getElementById('root')!).render(<ThemeProvider><div style={{position:'fixed',bottom:0,left:0,zIndex:999,fontSize:11,padding:6,background:'var(--surface-elevated)',color:'var(--text-primary)',border:'1px solid var(--border-primary)'}}>QA — DỮ LIỆU MẪU, KHÔNG PHẢI TÀI KHOẢN THẬT</div>{routes[page as keyof typeof routes]??routes.dashboard}</ThemeProvider>);
