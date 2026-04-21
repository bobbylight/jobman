import React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";

interface Props {
	interviewsByWeek: { week: string; count: number }[];
}

export default function InterviewsPerWeekChart({ interviewsByWeek }: Props) {
	if (interviewsByWeek.length === 0) {
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
					No interviews recorded
				</Typography>
			</Box>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart
				data={interviewsByWeek}
				margin={{ bottom: 4, left: 0, right: 16, top: 4 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
				<XAxis
					dataKey="week"
					tick={{ fontSize: 11 }}
					interval="preserveStartEnd"
				/>
				<YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
				<Tooltip formatter={(value) => [value, "Interviews"]} />
				<Bar dataKey="count" fill="#7b1fa2" radius={[3, 3, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}
