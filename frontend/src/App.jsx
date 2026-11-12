import { Routes, Route, Navigate } from 'react-router-dom';
import Launch from './pages/Launch.jsx';
import Menu from './pages/Menu.jsx';
import Checkout from './pages/Checkout.jsx';
import Payment from './pages/Payment.jsx';
import Done from './pages/Done.jsx';
import Admin from './pages/admin/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Launch />} />
      <Route path="/meja/:table" element={<Launch />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment/:id" element={<Payment />} />
      <Route path="/selesai" element={<Done />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
