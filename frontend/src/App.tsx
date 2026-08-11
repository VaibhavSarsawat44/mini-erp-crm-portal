import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Products } from './pages/Products';
import { Challans } from './pages/Challans';
import { ChallanCreate } from './pages/ChallanCreate';
import { ChallanDetail } from './pages/ChallanDetail';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="challans" element={<Challans />} />
            <Route path="challans/new" element={<ChallanCreate />} />
            <Route path="challans/:id" element={<ChallanDetail />} />
            <Route path="challans/:id/edit" element={<ChallanCreate />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
