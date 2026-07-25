import React, { useEffect, useState } from "react";
import { Box, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { api } from "../../api";
import ChartCard from "../shared/ChartCard";
import PageSpinner from "../shared/PageSpinner";
import type { StatsResponse, StatsWindow } from "../../types";
import StatCard from "../shared/StatCard";
import StatusDonutChart from "./StatusDonutChart";
import PipelineFunnelChart from "./PipelineFunnelChart";
import TransitionJobsDialog from "./TransitionJobsDialog";
import ApplicationsOverTime from "./ApplicationsOverTime";
import LookbackToggle from "../shared/LookbackToggle";
import AvgDaysChart from "./AvgDaysChart";
import PipelineOverTimeChart from "./PipelineOverTimeChart";
import TopCompaniesTable from "./TopCompaniesTable";
import InterviewsPerWeekChart from "./InterviewsPerWeekChart";
import { useActiveSearch } from "../../useActiveSearch";

export default function StatsPage() {
	const [window, setWindow] = useState<StatsWindow>("all");
	const [allRounds, setAllRounds] = useState(false);
	const [data, setData] = useState<StatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [linkClick, setLinkClick] = useState<{
		from: string;
		to: string;
	} | null>(null);
	const { activeSearch } = useActiveSearch();

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.getStats(window, allRounds ? "all" : "current")
			.then(setData)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [window, allRounds]);

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 4 }}>
			{/* Header row */}
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					justifyContent: "space-between",
					mb: 3,
				}}
			>
				<Box sx={{ alignItems: "center", display: "flex", gap: 1.5 }}>
					<Typography variant="h5" sx={{ fontWeight: 700 }}>
						Job Search Stats
					</Typography>
					{activeSearch && !allRounds && (
						<Chip label={activeSearch.name} size="small" />
					)}
				</Box>
				<Box sx={{ alignItems: "center", display: "flex", gap: 2 }}>
					<FormControlLabel
						control={
							<Switch
								checked={allRounds}
								onChange={(e) => setAllRounds(e.target.checked)}
								size="small"
							/>
						}
						label="All rounds"
						sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
					/>
					<LookbackToggle value={window} onChange={setWindow} />
				</Box>
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load stats. Please try again.
				</Typography>
			)}

			{loading ? <PageSpinner /> : null}
			{!loading && data && (
				<>
					{/* Metric cards row 1 */}
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
						<StatCard
							label="Companies Applied To"
							value={data.companiesApplied}
							subtitle="Unique companies"
						/>
						<StatCard
							label="Total Applications"
							value={data.totalApplications}
							subtitle="Excluding withdrawn"
						/>
						<StatCard
							label="Companies Phone Screened"
							value={data.companiesPhoneScreened}
							subtitle="Unique companies"
						/>
						<StatCard
							label="Companies On-Sited"
							value={data.companiesOnSited}
							subtitle="Unique companies"
						/>
					</Box>

					{/* Metric cards row 2 */}
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
						<StatCard
							label="Active Pipeline"
							value={data.activePipeline}
							subtitle="Not yet terminal"
						/>
						<StatCard
							label="Response Rate"
							value={
								data.responseRate !== null
									? Math.round(data.responseRate * 100)
									: null
							}
							suffix="%"
							subtitle={
								data.responseRate !== null
									? "Of submitted apps that got a reply"
									: "Not enough data"
							}
						/>
						<StatCard label="Offers Received" value={data.offersReceived} />
					</Box>

					{/* Charts row 1: Funnel (full width) */}
					<Box sx={{ mb: 2 }}>
						<ChartCard title="Pipeline Funnel">
							<PipelineFunnelChart
								transitions={data.transitions}
								onLinkClick={(from, to) => setLinkClick({ from, to })}
							/>
						</ChartCard>
					</Box>

					{/* Charts row 2: Donut + Avg Days Per Stage + Applications Over Time */}
					<Box
						sx={{
							display: "flex",
							gap: 2,
							flexWrap: "wrap",
							alignItems: "flex-start",
						}}
					>
						<ChartCard title="Status Breakdown" sx={{ flex: "1 1 340px" }}>
							<StatusDonutChart byStatus={data.byStatus} />
						</ChartCard>
						<ChartCard title="Avg. Days Per Stage" sx={{ flex: "1 1 340px" }}>
							<AvgDaysChart avgDaysPerStage={data.avgDaysPerStage} />
						</ChartCard>
						{window !== "30" && (
							<ChartCard
								title="Applications per Week"
								sx={{ flex: "1 1 340px" }}
							>
								<ApplicationsOverTime
									applicationsByWeek={data.applicationsByWeek}
								/>
							</ChartCard>
						)}
						<ChartCard title="Interviews per Week" sx={{ flex: "1 1 340px" }}>
							<InterviewsPerWeekChart
								interviewsByWeek={data.interviewsByWeek}
							/>
						</ChartCard>
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
						<ChartCard title="Pipeline Over Time" sx={{ flex: "1 1 340px" }}>
							<PipelineOverTimeChart statusOverTime={data.statusOverTime} />
						</ChartCard>
						<ChartCard
							title={`Top Companies (${allRounds ? "all time" : "this round"})`}
							sx={{ flex: "1 1 340px" }}
						>
							<TopCompaniesTable topCompanies={data.topCompanies} />
						</ChartCard>
					</Box>
				</>
			)}

			{linkClick !== null && (
				<TransitionJobsDialog
					from={linkClick.from}
					to={linkClick.to}
					open={linkClick !== null}
					scope={allRounds ? "all" : "current"}
					window={window}
					onClose={() => setLinkClick(null)}
				/>
			)}
		</Box>
	);
}
