import React from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { Box, Typography } from "@mui/material";

const TYPE_COLORS: Record<string, string> = {
	behavioral: "#66bb6a",
	coding: "#42a5f5",
	culture_fit: "#ec407a",
	leadership: "#ff7043",
	past_experience: "#26c6da",
	system_design: "#ab47bc",
};

const TYPE_LABELS: Record<string, string> = {
	recruiter_call: "Recruiter Call",
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	leadership: "Leadership",
	past_experience: "Past Experience",
	system_design: "System Design",
};

interface Props {
	byType: { type: string; count: number; passed: number; failed: number }[];
}

export default function TypeDonutChart({ byType }: Props) {
	if (byType.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 260,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No interviews recorded
				</Typography>
			</Box>
		);
	}

	const data = byType.map((d) => ({
		color: TYPE_COLORS[d.type] ?? "#90a4ae",
		name: TYPE_LABELS[d.type] ?? d.type,
		value: d.count,
	}));

	return (
		<ResponsiveContainer width="100%" height={260}>
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					innerRadius={65}
					outerRadius={95}
					paddingAngle={2}
					dataKey="value"
				>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.color} />
					))}
				</Pie>
				<Tooltip formatter={(value, name) => [value, name]} />
				<Legend
					iconType="circle"
					iconSize={10}
					formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
