import { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Fade,
  Breadcrumbs,
  Link,
  Snackbar,
} from '@mui/material';
import {
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useNotification } from '../hooks/useNotification';
import { UserTable } from '../components/admin/UserTable';
import { UserFilters } from '../components/admin/UserFilters';
import { AdminStats } from '../components/admin/AdminStats';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const {
    users,
    loading,
    error,
    total,
    adminId,
    searchTerm,
    updateUserRole,
    toggleUserStatus,
    searchUsers,
  } = useAdminUsers();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    if (user && !user.isAdmin) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || !user || !user.isAdmin) {
    return null;
  }

  const handleUpdateRole = async (userId: string, role: 'user' | 'admin') => {
    const result = await updateUserRole(userId, role);
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
    return result;
  };

  const handleToggleStatus = async (userId: string) => {
    const result = await toggleUserStatus(userId);
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
    return result;
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              mb: 2,
              '& .MuiBreadcrumbs-separator': {
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              },
              '& .MuiBreadcrumbs-ol': {
                alignItems: 'center',
              },
            }}
          >
            <Link
              color="inherit"
              onClick={() => navigate('/')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.9)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'white',
                  textDecoration: 'underline',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                },
              }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Home
            </Link>
            <Typography
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'white',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Admin Dashboard
            </Typography>
          </Breadcrumbs>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            User Management
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.9,
              maxWidth: 600,
            }}
          >
            Manage user accounts, roles, and access permissions
          </Typography>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Statistics Overview */}
        <AdminStats users={users} loading={loading} />

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <UserFilters
            searchTerm={searchTerm}
            onSearchChange={searchUsers}
            totalUsers={total}
          />

          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              py={8}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Fade in={!loading}>
              <Box>
                <UserTable
                  users={users}
                  adminId={adminId}
                  onUpdateRole={handleUpdateRole}
                  onToggleStatus={handleToggleStatus}
                />
              </Box>
            </Fade>
          )}
        </Paper>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={hideNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={hideNotification}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
