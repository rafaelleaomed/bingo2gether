import { createRoot } from "react-dom/client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import RefundPolicy from "./pages/RefundPolicy.tsx";
import TermsAndPrivacy from "./pages/TermsAndPrivacy.tsx";
import Contact from "./pages/Contact.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import FamilyOfficeRebalance from "./pages/FamilyOfficeRebalance.tsx";
import "./index.css";


createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/politica-reembolso" element={<RefundPolicy />} />
      <Route path="/termos-e-privacidade" element={<TermsAndPrivacy />} />
      <Route path="/contato" element={<Contact />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/family-office-ai" element={<FamilyOfficeRebalance />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
