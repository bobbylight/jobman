import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	components: {
		MuiAppBar: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: {
					backgroundColor: "#e0e7ff",
					borderBottom: "1px solid rgba(99,102,241,0.2)",
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				containedPrimary: {
					"&:hover": { boxShadow: "none" },
					borderRadius: 20,
					boxShadow: "none",
					fontWeight: 600,
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
		MuiChip: {
			styleOverrides: {
				root: { borderRadius: 6, fontWeight: 500 },
			},
		},
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					"&::-webkit-scrollbar": { height: 8, width: 8 },
					"&::-webkit-scrollbar-thumb": {
						background: "#c1c9d6",
						borderRadius: 4,
					},
					"&::-webkit-scrollbar-track": { background: "transparent" },
					scrollbarColor: "#c1c9d6 transparent",
				},
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				notchedOutline: {
					borderColor: "rgba(0,0,0,0.18)",
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: { backgroundImage: "none" },
			},
		},
	},
	palette: {
		background: {
			default: "#e8ecf3",
			paper: "#ffffff",
		},
		divider: "rgba(0,0,0,0.08)",
		mode: "light",
		primary: { main: "#6366f1" },
		secondary: { main: "#f59e0b" },
	},
	shape: { borderRadius: 10 },
	typography: {
		fontFamily: "Inter, sans-serif",
		h6: { fontWeight: 800, letterSpacing: "-0.02em" },
	},
});

export default theme;
