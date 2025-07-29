import { Box, Paper, Typography, Card, CardContent } from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { AdminUser } from '../../api/adminApi';

interface AdminStatsProps {
  users: AdminUser[];
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value.toLocaleString()}
          </Typography>
          <Typography variant="h6" color="text.primary" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: '50%',
            bgcolor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const AdminStats = ({ users, loading }: AdminStatsProps) => {
  if (loading) {
    return (
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
        gap={3}
        sx={{ mb: 4 }}
      >
        {[...Array(4)].map((_, index) => (
          <Paper
            key={index}
            sx={{
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
            }}
          >
            <Typography color="text.secondary">Loading...</Typography>
          </Paper>
        ))}
      </Box>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const adminUsers = users.filter((user) => user.role === 'admin').length;
  const recentUsers = users.filter((user) => {
    const createdAt = new Date(user.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdAt >= weekAgo;
  }).length;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: <PeopleIcon fontSize="large" />,
      color: '#1976d2',
      subtitle: `${activeUsers} active, ${totalUsers - activeUsers} inactive`,
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: <TrendingUpIcon fontSize="large" />,
      color: '#2e7d32',
      subtitle: `${((activeUsers / totalUsers) * 100).toFixed(1)}% of total`,
    },
    {
      title: 'Administrators',
      value: adminUsers,
      icon: <AdminIcon fontSize="large" />,
      color: '#ed6c02',
      subtitle: `${((adminUsers / totalUsers) * 100).toFixed(1)}% of total`,
    },
    {
      title: 'New This Week',
      value: recentUsers,
      icon: <PersonAddIcon fontSize="large" />,
      color: '#9c27b0',
      subtitle: 'Users joined recently',
    },
  ];

  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
      gap={3}
      sx={{ mb: 4 }}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </Box>
  );
};
