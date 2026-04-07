import React, { useEffect, useState } from "react";
import {
	Box,
	Card,
	CardContent,
	CircularProgress,
	Typography,
} from "@mui/material";
import { api } from "../api";
import type { StatsResponse, StatsWindow } from "../types";
import StatCard from "./stats/StatCard";
import StatusDonutChart from "./stats/StatusDonutChart";
import PipelineFunnelChart from "./stats/PipelineFunnelChart";
import ApplicationsOverTime from "./stats/ApplicationsOverTime";
import LookbackToggle from "./stats/LookbackToggle";
import AvgDaysChart from "./stats/AvgDaysChart";
import PipelineOverTimeChart from "./stats/PipelineOverTimeChart";
import TopCompaniesTable from "./stats/TopCompaniesTable";

function formatPercent(rate: number | null): string {
	if (rate === null) return "—";
	return `${Math.round(rate * 100)}%`;
}

export default function StatsPage() {
	const [window, setWindow] = useState<StatsWindow>("all");
	const [data, setData] = useState<StatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.getStats(window)
			.then(setData)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [window]);

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 4 }}>
			{/* Header row */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: 3,
					flexWrap: "wrap",
					gap: 2,
				}}
			>
				<Typography variant="h5" fontWeight={700}>
					Job Search Stats
				</Typography>
				<LookbackToggle value={window} onChange={setWindow} />
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load stats. Please try again.
				</Typography>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			) : data ? (
				<>
					{/* Metric cards */}
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
						<StatCard
							label="Total Applications"
							value={data.totalApplications}
							subtitle="Excluding withdrawn"
						/>
						<StatCard
							label="Active Pipeline"
							value={data.activePipeline}
							subtitle="Not yet terminal"
						/>
						<StatCard label="Offers Received" value={data.offersReceived} />
						<StatCard
							label="Response Rate"
							value={formatPercent(data.responseRate)}
							subtitle={
								data.responseRate !== null
									? "Of submitted apps that got a reply"
									: "Not enough data"
							}
						/>
					</Box>

					{/* Charts row 1: Funnel + Donut */}
					<Box
						sx={{
							display: "flex",
							gap: 2,
							flexWrap: "wrap",
							alignItems: "flex-start",
							mb: 2,
						}}
					>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Pipeline Funnel
								</Typography>
								<PipelineFunnelChart transitions={data.transitions} />
							</CardContent>
						</Card>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Status Breakdown
								</Typography>
								<StatusDonutChart byStatus={data.byStatus} />
							</CardContent>
						</Card>
					</Box>

					{/* Charts row 2: Avg Days Per Stage + Applications Over Time */}
					<Box
						sx={{
							display: "flex",
							gap: 2,
							flexWrap: "wrap",
							alignItems: "flex-start",
						}}
					>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Avg. Days Per Stage
								</Typography>
								<AvgDaysChart avgDaysPerStage={data.avgDaysPerStage} />
							</CardContent>
						</Card>
						{window !== "30" && (
							<Card sx={{ flex: "1 1 340px" }}>
								<CardContent>
									<Typography
										variant="subtitle2"
										color="text.secondary"
										gutterBottom
									>
										Applications Over Time
									</Typography>
									<ApplicationsOverTime
										applicationsByWeek={data.applicationsByWeek}
									/>
								</CardContent>
							</Card>
						)}
					</Box>
					{/* Charts row 3: Pipeline Over Time + Top Companies */}
					<Box
						sx={{
							display: "flex",
							gap: 2,
							flexWrap: "wrap",
							alignItems: "flex-start",
							mt: 2,
						}}
					>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Pipeline Over Time
								</Typography>
								<PipelineOverTimeChart statusOverTime={data.statusOverTime} />
							</CardContent>
						</Card>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Top Companies (all time)
								</Typography>
								<TopCompaniesTable topCompanies={data.topCompanies} />
							</CardContent>
						</Card>
					</Box>
				</>
			) : null}
		</Box>
	);
}
