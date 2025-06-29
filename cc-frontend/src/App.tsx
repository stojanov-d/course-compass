import { ThemeProvider } from '@emotion/react';
import './App.css';
import { AppRouter } from './router';
import { theme } from './styles/theme';
import { CssBaseline } from '@mui/material';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <main>
        <AppRouter />
      </main>
    </ThemeProvider>
  );
}

export default App;
