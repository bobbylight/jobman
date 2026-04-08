import React, { useState } from "react";
import {
	AppBar,
	Toolbar,
	Box,
	Avatar,
	IconButton,
	Menu,
	MenuItem,
	Divider,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import Tooltip from "@mui/material/Tooltip";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import type { User } from "../types";

const NAV_ITEMS = [
	{ path: "/jobs", icon: <ViewKanbanOutlinedIcon />, label: "Board" },
	{
		path: "/interviews",
		icon: <CalendarMonthOutlinedIcon />,
		label: "Interviews",
	},
	{ path: "/stats", icon: <InsightsIcon />, label: "Stats" },
] as const;

interface Props {
	currentUser: User;
	onLogout: () => void;
}

export default function AppShell({ currentUser, onLogout }: Props) {
	const navigate = useNavigate();
	const location = useLocation();
	const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
		null,
	);

	return (
		<>
			<AppBar position="sticky">
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
							sx={{ width: 32, height: 32 }}
						/>
					</IconButton>
					<Menu
						anchorEl={userMenuAnchor}
						open={Boolean(userMenuAnchor)}
						onClose={() => setUserMenuAnchor(null)}
						anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
						transformOrigin={{ vertical: "top", horizontal: "right" }}
						slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160 } } }}
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
					height: "calc(100vh - 56px)",
					overflow: "hidden",
				}}
			>
				{/* Navigation Rail */}
				<Box
					component="nav"
					sx={{
						width: 56,
						flexShrink: 0,
						bgcolor: "#e0e7ff",
						borderRight: "1px solid rgba(99,102,241,0.2)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						pt: 1.5,
						gap: 0.5,
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
										width: 40,
										height: 40,
										borderRadius: 2,
										color: active ? "primary.main" : "text.secondary",
										bgcolor: active ? "rgba(99,102,241,0.12)" : "transparent",
										"&:hover": {
											bgcolor: active
												? "rgba(99,102,241,0.18)"
												: "rgba(0,0,0,0.04)",
										},
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
						flex: 1,
						bgcolor: "background.default",
						minWidth: 0,
						overflowY: "auto",
					}}
				>
					<Outlet />
				</Box>
			</Box>
		</>
	);
}
