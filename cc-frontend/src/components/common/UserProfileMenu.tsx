import { useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { User } from '../../types/user';

interface UserProfileMenuProps {
  user: User;
  onLogout: () => void;
}

export const UserProfileMenu = ({ user, onLogout }: UserProfileMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          p: 0,
          bgcolor: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
        }}
      >
        <Avatar
          alt={user.displayName}
          src={user.avatarUrl || ''}
          sx={{ width: 40, height: 40 }}
        />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.username}
          </Typography>
        </Box>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
