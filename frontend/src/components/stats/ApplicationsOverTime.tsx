import React from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";

interface Props {
	applicationsByWeek: { week: string; count: number }[];
}

export default function ApplicationsOverTime({ applicationsByWeek }: Props) {
	if (applicationsByWeek.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 220,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No data for this period
				</Typography>
			</Box>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={220}>
			<LineChart
				data={applicationsByWeek}
				margin={{ bottom: 4, left: 0, right: 16, top: 4 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
				<XAxis
					dataKey="week"
					tick={{ fontSize: 11 }}
					interval="preserveStartEnd"
				/>
				<YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
				<Tooltip formatter={(value) => [value, "Applications"]} />
				<Line
					type="monotone"
					dataKey="count"
					stroke="#1e88e5"
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 4 }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
