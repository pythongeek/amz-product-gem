import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Research from "./pages/Research";
import ResearchResults from "./pages/ResearchResults";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Calculator from "./pages/Calculator";
import Launch from "./pages/Launch";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import KnowledgeBase from "./pages/admin/KnowledgeBase";
import NotFound from "./pages/NotFound";
import KeywordResearchResults from "./pages/KeywordResearchResults";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/research" element={<Research />} />
      <Route path="/research/results" element={<ResearchResults />} />
      <Route path="/research/keyword-results" element={<KeywordResearchResults />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/calculator" element={<Calculator />} />
      <Route path="/launch/:productId" element={<Launch />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin/knowledge-base" element={<KnowledgeBase />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
