import React from "react";
import {
	Bar,
	BarChart,
	Cell,
	LabelList,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";

const TYPE_COLORS: Record<string, string> = {
	behavioral: "#66bb6a",
	coding: "#42a5f5",
	culture_fit: "#ec407a",
	system_design: "#ab47bc",
	technical: "#ff7043",
};

const TYPE_LABELS: Record<string, string> = {
	recruiter_call: "Recruiter Call",
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	system_design: "System Design",
	technical: "Technical",
};

interface Props {
	questionsByType: {
		type: string;
		count: number;
		avgDifficulty: number;
	}[];
}

export default function QuestionsByTypeChart({ questionsByType }: Props) {
	if (questionsByType.length === 0) {
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
					No questions recorded yet
				</Typography>
			</Box>
		);
	}

	const data = questionsByType.map((d) => ({
		avgLabel: `avg ${d.avgDifficulty}/5`,
		count: d.count,
		type: TYPE_LABELS[d.type] ?? d.type,
		typeKey: d.type,
	}));

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart
				data={data}
				layout="vertical"
				margin={{ bottom: 4, left: 8, right: 80, top: 4 }}
			>
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="type"
					width={100}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					formatter={(value, name) =>
						name === "count" ? [value, "Questions"] : [value, "Avg difficulty"]
					}
					cursor={{ fill: "rgba(0,0,0,0.04)" }}
				/>
				<Bar dataKey="count" radius={[0, 4, 4, 0]}>
					{data.map((entry) => (
						<Cell
							key={entry.typeKey}
							fill={TYPE_COLORS[entry.typeKey] ?? "#90a4ae"}
						/>
					))}
					<LabelList
						dataKey="avgLabel"
						position="right"
						style={{ fontSize: 11 }}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
