import { Outlet } from 'react-router-dom';

const AdminLayoutWrapper = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* No Navbar / No Footer here */}
      <Outlet />
    </div>
  );
};

export default AdminLayoutWrapper;
