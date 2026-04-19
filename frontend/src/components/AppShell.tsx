import React, { useState } from "react";
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
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import Tooltip from "@mui/material/Tooltip";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { User } from "../types";

const NAV_ITEMS = [
	{ icon: <ViewKanbanOutlinedIcon />, label: "Board", path: "/jobs" },
	{
		icon: <CalendarMonthOutlinedIcon />,
		label: "Interviews",
		path: "/interviews",
	},
	{ icon: <InsightsIcon />, label: "Stats", path: "/stats" },
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
						flex: 1,
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
