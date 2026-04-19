import React from "react";
import {
	Area,
	AreaChart,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { STATUSES, STATUS_COLORS } from "../../constants";
import type { JobStatus } from "../../types";

interface Props {
	statusOverTime: { week: string; status: string; count: number }[];
}

type DataPoint = { week: string } & Partial<Record<JobStatus, number>>;

function pivotData(rows: Props["statusOverTime"]): DataPoint[] {
	const byWeek = new Map<string, DataPoint>();
	for (const row of rows) {
		if (!byWeek.has(row.week)) {
			byWeek.set(row.week, { week: row.week });
		}
		(byWeek.get(row.week) as DataPoint)[row.status as JobStatus] = row.count;
	}
	return [...byWeek.values()];
}

function formatWeek(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	return d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	});
}

export default function PipelineOverTimeChart({ statusOverTime }: Props) {
	if (statusOverTime.length === 0) {
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
					No data yet — move jobs through stages to see the pipeline over time
				</Typography>
			</Box>
		);
	}

	const data = pivotData(statusOverTime);
	const presentStatuses = STATUSES.filter((s) =>
		statusOverTime.some((r) => r.status === s),
	);

	return (
		<ResponsiveContainer width="100%" height={260}>
			<AreaChart
				data={data}
				margin={{ bottom: 4, left: -20, right: 8, top: 4 }}
			>
				<XAxis
					dataKey="week"
					tickFormatter={formatWeek}
					tick={{ fontSize: 11 }}
					interval="preserveStartEnd"
				/>
				<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
				<Tooltip
					labelFormatter={(label) => formatWeek(String(label))}
					formatter={(value, name) => [value, name]}
					contentStyle={{ fontSize: 12 }}
				/>
				<Legend wrapperStyle={{ fontSize: 11 }} />
				{presentStatuses.map((status) => (
					<Area
						key={status}
						type="monotone"
						dataKey={status}
						stackId="pipeline"
						stroke={STATUS_COLORS[status as JobStatus]}
						fill={STATUS_COLORS[status as JobStatus]}
						fillOpacity={0.7}
					/>
				))}
			</AreaChart>
		</ResponsiveContainer>
	);
}
