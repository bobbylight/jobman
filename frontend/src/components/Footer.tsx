import React from "react";
import { Box, Link, Typography } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function Footer() {
	return (
		<Box
			component="footer"
			sx={{
				alignItems: "center",
				borderTop: "1px solid rgba(99,102,241,0.15)",
				color: "text.secondary",
				display: "flex",
				gap: 1.5,
				justifyContent: "center",
				px: 3,
				py: 1.25,
			}}
		>
			<Typography variant="caption">
				© {new Date().getFullYear()} JobMan
			</Typography>
			<Typography variant="caption" sx={{ opacity: 0.4 }}>
				·
			</Typography>
			<Link
				href="https://github.com/bobbylight/jobman/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				variant="caption"
				underline="hover"
				color="inherit"
				sx={{ "&:hover": { color: "primary.main" } }}
			>
				MIT License
			</Link>
			<Typography variant="caption" sx={{ opacity: 0.4 }}>
				·
			</Typography>
			<Link
				href="https://github.com/bobbylight/jobman"
				target="_blank"
				rel="noopener noreferrer"
				color="inherit"
				underline="none"
				sx={{
					alignItems: "center",
					display: "flex",
					gap: 0.5,
					"&:hover": { color: "primary.main" },
				}}
			>
				<GitHubIcon sx={{ fontSize: 13 }} />
				<Typography variant="caption">GitHub</Typography>
			</Link>
		</Box>
	);
}
