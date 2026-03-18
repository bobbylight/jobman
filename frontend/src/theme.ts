import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	typography: {
		fontFamily: "Inter, sans-serif",
	},
	palette: {
		mode: "light",
		primary: { main: "#1976d2" },
		background: { default: "#f0f4f8" },
	},
	components: {
		MuiCard: {
			styleOverrides: {
				root: { borderRadius: 10 },
			},
		},
		MuiChip: {
			styleOverrides: {
				root: { fontWeight: 500 },
			},
		},
	},
});

export default theme;
