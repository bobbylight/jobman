import React from "react";
import { Box, Typography } from "@mui/material";

interface Props {
	dateStr: string;
	children: React.ReactNode;
}

export default function DayTimeline({ dateStr, children }: Props) {
	const d = new Date(dateStr);
	const isToday = d.toDateString() === new Date().toDateString();
	const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
	const dateLabel = d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
	});

	return (
		<Box sx={{ alignItems: "stretch", display: "flex", mb: 1.5 }}>
			<Box
				sx={{
					flexShrink: 0,
					pr: 1.5,
					pt: 0.5,
					textAlign: "right",
					width: 48,
				}}
			>
				<Typography
					variant="caption"
					color={isToday ? "primary.main" : "text.secondary"}
					sx={{ display: "block", fontWeight: 600, lineHeight: 1.3 }}
				>
					{weekday}
				</Typography>
				<Typography
					variant="caption"
					color={isToday ? "primary.main" : "text.disabled"}
					sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1.3 }}
				>
					{dateLabel}
				</Typography>
			</Box>
			<Box
				sx={{
					bgcolor: isToday ? "primary.light" : "divider",
					borderRadius: "2px",
					flexShrink: 0,
					mr: 1.5,
					width: "2px",
				}}
			/>
			<Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
		</Box>
	);
}
