import React, { useCallback, useEffect, useState } from "react";
import {
	Box,
	CircularProgress,
	CssBaseline,
	ThemeProvider,
} from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import theme from "./theme";
import { api, setUnauthorizedHandler } from "./api";
import type { User } from "./types";
import LoginPage from "./components/LoginPage";
import AppShell from "./components/AppShell";
import JobManagementPage from "./components/JobManagementPage";
import InterviewsPage from "./components/InterviewsPage";
import StatsPage from "./components/StatsPage";

export default function App() {
	// Undefined = auth check in progress, null = unauthenticated, User = authenticated
	const [currentUser, setCurrentUser] = useState<User | null | undefined>(
		undefined,
	);

	// Register a global handler so any 401 mid-session clears the user and shows LoginPage
	useEffect(() => {
		setUnauthorizedHandler(() => setCurrentUser(null));
	}, []);

	// Check session on mount
	useEffect(() => {
		async function init() {
			try {
				const user = await api.getMe();
				setCurrentUser(user);
			} catch {
				setCurrentUser(null);
			}
		}
		void init();
	}, []);

	const handleLogout = useCallback(async () => {
		await api.logout();
		setCurrentUser(null);
	}, []);

	// Auth check still in progress
	if (currentUser === undefined) {
		return (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			</ThemeProvider>
		);
	}

	// Not authenticated
	if (currentUser === null) {
		return (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<LoginPage />
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<Routes>
					<Route
						element={
							<AppShell currentUser={currentUser} onLogout={handleLogout} />
						}
					>
						<Route path="/" element={<Navigate to="/jobs" replace />} />
						<Route path="/jobs" element={<JobManagementPage />} />
						<Route path="/jobs/:jobId" element={<JobManagementPage />} />
						<Route path="/interviews" element={<InterviewsPage />} />
						<Route path="/stats" element={<StatsPage />} />
						<Route path="*" element={<Navigate to="/jobs" replace />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</ThemeProvider>
	);
}
