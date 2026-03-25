import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	palette: {
		mode: "light",
		primary: { main: "#6366f1" },
		secondary: { main: "#f59e0b" },
		background: {
			default: "#e8ecf3",
			paper: "#ffffff",
		},
		divider: "rgba(0,0,0,0.08)",
	},
	typography: {
		fontFamily: "Inter, sans-serif",
		h6: { fontWeight: 800, letterSpacing: "-0.02em" },
	},
	shape: { borderRadius: 10 },
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					scrollbarColor: "#c1c9d6 transparent",
					"&::-webkit-scrollbar": { width: 8, height: 8 },
					"&::-webkit-scrollbar-thumb": {
						background: "#c1c9d6",
						borderRadius: 4,
					},
					"&::-webkit-scrollbar-track": { background: "transparent" },
				},
			},
		},
		MuiAppBar: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: {
					backgroundColor: "#e0e7ff",
					borderBottom: "1px solid rgba(99,102,241,0.2)",
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
					border: "1px solid rgba(0,0,0,0.08)",
					boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				containedPrimary: {
					borderRadius: 20,
					fontWeight: 600,
					boxShadow: "none",
					"&:hover": { boxShadow: "none" },
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: { fontWeight: 500, borderRadius: 6 },
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: { backgroundImage: "none" },
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				notchedOutline: {
					borderColor: "rgba(0,0,0,0.18)",
				},
			},
		},
	},
});

export default theme;
