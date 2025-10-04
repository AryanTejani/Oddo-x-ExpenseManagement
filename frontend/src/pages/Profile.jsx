import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          User profile management will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Profile;

