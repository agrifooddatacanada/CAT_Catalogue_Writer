import React from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import theme from "../../theme";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          component="main"
          role="alert"
          sx={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
          }}
        >
          <Paper
            elevation={2}
            sx={{ maxWidth: 520, width: "100%", p: 4, textAlign: "center", borderRadius: 2 }}
          >
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              An unexpected error occurred while rendering this page. You can reload or return to
              the home page.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                onClick={this.handleReload}
                sx={{
                  backgroundColor: theme.primaryColor,
                  "&:hover": { backgroundColor: theme.primaryColor, filter: "brightness(0.92)" },
                }}
              >
                Reload Page
              </Button>
              <Button variant="outlined" onClick={this.handleGoHome}>
                Return to Home
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
