import React, { useCallback, useEffect, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Divider,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Toolbar,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import InsightsIcon from "@mui/icons-material/Insights";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import RadarIcon from "@mui/icons-material/Radar";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import Tooltip from "@mui/material/Tooltip";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApiError, api } from "../../api";
import { useNotify } from "../../useSnackbar";
import type { BlockingJob, JobSearch, User } from "../../types";
import Footer from "./Footer";
import NewSearchRoundDialog from "./NewSearchRoundDialog";
import NewSearchRoundConfirmDialog from "./NewSearchRoundConfirmDialog";

const NAV_ITEMS = [
	{ icon: <ViewKanbanOutlinedIcon />, label: "Board", path: "/jobs" },
	{
		icon: <CalendarMonthOutlinedIcon />,
		label: "Calendar",
		path: "/calendar",
	},
	{ icon: <InsightsIcon />, label: "Stats", path: "/stats" },
	{
		icon: <PsychologyOutlinedIcon />,
		label: "Insights",
		path: "/insights",
	},
	{ icon: <RadarIcon />, label: "Radar", path: "/radar" },
	{ icon: <CompareArrowsIcon />, label: "Offers", path: "/offers" },
] as const;

interface Props {
	currentUser: User;
	onLogout: () => void;
}

export default function AppShell({ currentUser, onLogout }: Props) {
	const navigate = useNavigate();
	const location = useLocation();
	const notify = useNotify();
	const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
		null,
	);

	const [activeSearch, setActiveSearch] = useState<JobSearch | null>(null);
	// Bumped whenever a new job search starts, forcing routed pages to remount and refetch.
	const [roundVersion, setRoundVersion] = useState(0);
	const [newSearchOpen, setNewSearchOpen] = useState(false);
	const [pendingSearch, setPendingSearch] = useState<{
		name: string;
		notes: string | null;
	} | null>(null);
	const [blockingJobs, setBlockingJobs] = useState<BlockingJob[] | null>(null);

	useEffect(() => {
		async function loadActiveSearch() {
			try {
				setActiveSearch(await api.getActiveSearch());
			} catch (error) {
				if (!(error instanceof ApiError && error.status === 404)) {
					notify("Failed to load active job search", "error");
				}
			}
		}
		void loadActiveSearch();
	}, [notify]);

	const openNewSearch = useCallback(() => {
		setUserMenuAnchor(null);
		setBlockingJobs(null);
		setNewSearchOpen(true);
	}, []);

	const closeNewSearch = useCallback(() => {
		setNewSearchOpen(false);
		setBlockingJobs(null);
	}, []);

	const handleNameEntered = useCallback(
		(name: string, notes: string | null) => {
			setPendingSearch({ name, notes });
			setNewSearchOpen(false);
		},
		[],
	);

	const handleConfirmStart = useCallback(async () => {
		if (!pendingSearch) {
			return;
		}
		try {
			const search = await api.startNewSearch(
				pendingSearch.name,
				pendingSearch.notes,
			);
			setActiveSearch(search);
			setPendingSearch(null);
			setRoundVersion((v) => v + 1);
			notify(`Started new job search "${search.name}"`);
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				const body = error.body as { blockingJobs?: BlockingJob[] } | undefined;
				setBlockingJobs(body?.blockingJobs ?? []);
				setPendingSearch(null);
				setNewSearchOpen(true);
			} else {
				notify("Failed to start new job search", "error");
				setPendingSearch(null);
			}
		}
	}, [pendingSearch, notify]);

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				overflow: "hidden",
			}}
		>
			<AppBar position="static">
				<Toolbar sx={{ gap: 1, minHeight: "56px !important" }}>
					<Box
						component="img"
						src="/img/logo.svg"
						alt="JobMan"
						sx={{ height: 52 }}
					/>
					<Box sx={{ flexGrow: 1 }} />
					<IconButton
						onClick={(e) => setUserMenuAnchor(e.currentTarget)}
						size="small"
						sx={{ p: 0 }}
						aria-label="User menu"
					>
						<Avatar
							src={currentUser.avatarUrl ?? undefined}
							alt={currentUser.displayName ?? currentUser.email}
							sx={{ height: 32, width: 32 }}
						/>
					</IconButton>
					<Menu
						anchorEl={userMenuAnchor}
						open={Boolean(userMenuAnchor)}
						onClose={() => setUserMenuAnchor(null)}
						anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
						transformOrigin={{ horizontal: "right", vertical: "top" }}
						slotProps={{ paper: { sx: { minWidth: 160, mt: 0.5 } } }}
					>
						<MenuItem onClick={() => setUserMenuAnchor(null)}>
							<ListItemIcon>
								<AccountCircleOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>View Profile</ListItemText>
						</MenuItem>
						<MenuItem onClick={() => setUserMenuAnchor(null)}>
							<ListItemIcon>
								<SettingsOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>Settings</ListItemText>
						</MenuItem>
						<Divider />
						<MenuItem onClick={openNewSearch}>
							<ListItemIcon>
								<AutorenewIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>New Job Search</ListItemText>
						</MenuItem>
						<Divider />
						<MenuItem
							onClick={() => {
								setUserMenuAnchor(null);
								onLogout();
							}}
						>
							<ListItemIcon>
								<LogoutOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>Sign Out</ListItemText>
						</MenuItem>
					</Menu>
				</Toolbar>
			</AppBar>

			<Box
				sx={{
					display: "flex",
					flex: 1,
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				{/* Navigation Rail */}
				<Box
					component="nav"
					sx={{
						alignItems: "center",
						bgcolor: "#e0e7ff",
						borderRight: "1px solid rgba(99,102,241,0.2)",
						display: "flex",
						flexDirection: "column",
						flexShrink: 0,
						gap: 0.5,
						pt: 1.5,
						width: 56,
					}}
				>
					{NAV_ITEMS.map(({ path, icon, label }) => {
						const active = location.pathname.startsWith(path);
						return (
							<Tooltip key={path} title={label} placement="right">
								<IconButton
									aria-label={label}
									onClick={() => navigate(path)}
									sx={{
										"&:hover": {
											bgcolor: active
												? "rgba(99,102,241,0.18)"
												: "rgba(0,0,0,0.04)",
										},
										bgcolor: active ? "rgba(99,102,241,0.12)" : "transparent",
										borderRadius: 2,
										color: active ? "primary.main" : "text.secondary",
										height: 40,
										width: 40,
									}}
								>
									{icon}
								</IconButton>
							</Tooltip>
						);
					})}
				</Box>

				{/* Page content */}
				<Box
					sx={{
						bgcolor: "background.default",
						display: "flex",
						flex: 1,
						flexDirection: "column",
						minWidth: 0,
						overflowY: "auto",
					}}
				>
					<Box sx={{ flex: 1 }}>
						<Outlet key={roundVersion} />
					</Box>
					<Footer />
				</Box>
			</Box>

			<NewSearchRoundDialog
				open={newSearchOpen}
				blockingJobs={blockingJobs}
				onConfirm={handleNameEntered}
				onCancel={closeNewSearch}
			/>

			<NewSearchRoundConfirmDialog
				open={pendingSearch !== null}
				currentSearchName={activeSearch?.name ?? null}
				newSearchName={pendingSearch?.name ?? ""}
				onConfirm={handleConfirmStart}
				onCancel={() => setPendingSearch(null)}
			/>
		</Box>
	);
}
