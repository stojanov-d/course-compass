import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { AdminUser } from '../../api/adminApi';

interface UserTableProps {
  users: AdminUser[];
  adminId: string;
  onUpdateRole: (
    userId: string,
    role: 'user' | 'admin'
  ) => Promise<{ success: boolean; message: string }>;
  onToggleStatus: (
    userId: string
  ) => Promise<{ success: boolean; message: string }>;
}

interface UserMenuProps {
  user: AdminUser;
  isCurrentAdmin: boolean;
  onUpdateRole: (
    userId: string,
    role: 'user' | 'admin'
  ) => Promise<{ success: boolean; message: string }>;
  onToggleStatus: (
    userId: string
  ) => Promise<{ success: boolean; message: string }>;
}

const UserMenu = ({
  user,
  isCurrentAdmin,
  onUpdateRole,
  onToggleStatus,
}: UserMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRoleToggle = async () => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await onUpdateRole(user.id, newRole);
    handleClose();
  };

  const handleStatusToggle = async () => {
    await onToggleStatus(user.id);
    handleClose();
  };

  const canModifyRole = !isCurrentAdmin;
  const canModifyStatus = !isCurrentAdmin;

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        disabled={!canModifyRole && !canModifyStatus}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {canModifyRole && (
          <MenuItem onClick={handleRoleToggle}>
            <ListItemIcon>
              {user.role === 'admin' ? <PersonIcon /> : <AdminIcon />}
            </ListItemIcon>
            <ListItemText>
              {user.role === 'admin' ? 'Make User' : 'Make Admin'}
            </ListItemText>
          </MenuItem>
        )}
        {canModifyStatus && (
          <MenuItem onClick={handleStatusToggle}>
            <ListItemIcon>
              {user.isActive ? <PersonOffIcon /> : <PersonAddIcon />}
            </ListItemIcon>
            <ListItemText>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export const UserTable = ({
  users,
  adminId,
  onUpdateRole,
  onToggleStatus,
}: UserTableProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (users.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        py={8}
        bgcolor="background.paper"
        borderRadius={2}
      >
        <Typography variant="h6" color="text.secondary">
          No users found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>User</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const isCurrentAdmin = user.id === adminId;
            return (
              <TableRow
                key={user.id}
                sx={{
                  '&:hover': { bgcolor: 'grey.50' },
                  opacity: user.isActive ? 1 : 0.6,
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.displayName}
                      sx={{ width: 40, height: 40 }}
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {user.displayName}
                        {isCurrentAdmin && (
                          <Chip
                            label="You"
                            size="small"
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    icon={
                      user.role === 'admin' ? <AdminIcon /> : <PersonIcon />
                    }
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.isActive ? 'success' : 'error'}
                    variant={user.isActive ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(user.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <UserMenu
                    user={user}
                    isCurrentAdmin={isCurrentAdmin}
                    onUpdateRole={onUpdateRole}
                    onToggleStatus={onToggleStatus}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
