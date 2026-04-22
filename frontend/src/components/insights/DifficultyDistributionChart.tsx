import React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";

const PASS_COLOR = "#66bb6a";
const FAIL_COLOR = "#ef5350";
const NO_RESULT_COLOR = "#90a4ae";

interface Props {
	difficultyDistribution: {
		difficulty: number;
		count: number;
		passed: number;
		failed: number;
	}[];
}

export default function DifficultyDistributionChart({
	difficultyDistribution,
}: Props) {
	if (difficultyDistribution.length === 0) {
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

	const data = difficultyDistribution.map((d) => ({
		difficulty: `★${d.difficulty}`,
		failed: d.failed,
		noResult: d.count - d.passed - d.failed,
		passed: d.passed,
	}));

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart data={data} margin={{ bottom: 4, left: 0, right: 16, top: 4 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
				<XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
				<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
				<Tooltip />
				<Legend
					iconSize={10}
					formatter={(value) => {
						let label = "No interview result";
						if (value === "passed") {
							label = "In interviews I passed";
						} else if (value === "failed") {
							label = "In interviews I failed";
						}
						return <span style={{ fontSize: 12 }}>{label}</span>;
					}}
				/>
				<Bar
					dataKey="passed"
					stackId="a"
					fill={PASS_COLOR}
					radius={[0, 0, 0, 0]}
				/>
				<Bar
					dataKey="failed"
					stackId="a"
					fill={FAIL_COLOR}
					radius={[0, 0, 0, 0]}
				/>
				<Bar
					dataKey="noResult"
					name="No interview result"
					stackId="a"
					fill={NO_RESULT_COLOR}
					radius={[3, 3, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
