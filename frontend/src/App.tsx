import React, { useCallback, useEffect, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import theme from "./theme";
import { api, setUnauthorizedHandler } from "./api";
import type { User } from "./types";
import LoginPage from "./components/LoginPage";
import PageSpinner from "./components/PageSpinner";
import AppShell from "./components/AppShell";
import InsightsPage from "./components/InsightsPage";
import JobManagementPage from "./components/JobManagementPage";
import InterviewsPage from "./components/InterviewsPage";
import RadarPage from "./components/RadarPage";
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

	let content: React.ReactNode;
	if (currentUser === undefined) {
		content = <PageSpinner />;
	} else if (currentUser === null) {
		content = <LoginPage />;
	} else {
		content = (
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
						<Route path="/calendar" element={<InterviewsPage />} />
						<Route path="/stats" element={<StatsPage />} />
						<Route path="/insights" element={<InsightsPage />} />
						<Route path="/radar" element={<RadarPage />} />
						<Route path="*" element={<Navigate to="/jobs" replace />} />
					</Route>
				</Routes>
			</BrowserRouter>
		);
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{content}
		</ThemeProvider>
	);
}
