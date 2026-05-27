import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { api } from "../../api";
import ChartCard from "../shared/ChartCard";
import PageSpinner from "../shared/PageSpinner";
import type { InterviewInsightsResponse, StatsWindow } from "../../types";
import StatCard from "../shared/StatCard";
import LookbackToggle from "../shared/LookbackToggle";
import TypeDonutChart from "./TypeDonutChart";
import PassRateByTypeChart from "./PassRateByTypeChart";
import FeelingCalibrationChart from "./FeelingCalibrationChart";
import QuestionsByTypeChart from "./QuestionsByTypeChart";
import DifficultyDistributionChart from "./DifficultyDistributionChart";
import QuestionBankTable from "./QuestionBankTable";

export default function InsightsPage() {
	const [window, setWindow] = useState<StatsWindow>("all");
	const [data, setData] = useState<InterviewInsightsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.getInterviewInsights(window)
			.then(setData)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [window]);

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
				<Typography variant="h5" sx={{ fontWeight: 700 }}>
					Interview Insights
				</Typography>
				<LookbackToggle value={window} onChange={setWindow} />
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load insights. Please try again.
				</Typography>
			)}

			{loading ? <PageSpinner /> : null}

			{!loading && data && (
				<>
					{/* Row 1: Summary stat cards */}
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4 }}>
						<StatCard label="Interviews" value={data.totalInterviews} />
						<StatCard
							label="Pass Rate"
							value={
								data.passRate !== null ? Math.round(data.passRate * 100) : null
							}
							suffix="%"
							subtitle={
								data.passRate !== null
									? "Of interviews with recorded result"
									: "No results recorded yet"
							}
						/>
						<StatCard label="Questions Answered" value={data.totalQuestions} />
						<StatCard
							label="Avg Difficulty"
							value={data.avgDifficulty}
							suffix=" / 5"
							subtitle={
								data.avgDifficulty !== null
									? "Across all questions"
									: "No questions yet"
							}
						/>
					</Box>

					{/* Row 2: Interview type breakdown */}
					<Box
						sx={{
							alignItems: "flex-start",
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							mb: 2,
						}}
					>
						<ChartCard title="Interview Types" sx={{ flex: "1 1 340px" }}>
							<TypeDonutChart byType={data.byType} />
						</ChartCard>
						<ChartCard title="Pass Rate by Type" sx={{ flex: "1 1 340px" }}>
							<PassRateByTypeChart byType={data.byType} />
						</ChartCard>
					</Box>

					{/* Row 3: Feeling calibration (full width) */}
					<Box sx={{ mb: 2 }}>
						<ChartCard title="How Well Does Your Gut Predict Outcome?">
							<FeelingCalibrationChart feelingVsResult={data.feelingVsResult} />
						</ChartCard>
					</Box>

					{/* Row 4: Question insights */}
					<Box
						sx={{
							alignItems: "flex-start",
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							mb: 2,
						}}
					>
						<ChartCard title="Questions by Type" sx={{ flex: "1 1 340px" }}>
							<QuestionsByTypeChart questionsByType={data.questionsByType} />
						</ChartCard>
						<ChartCard
							title="Question Difficulty by Interview Outcome"
							sx={{ flex: "1 1 340px" }}
						>
							<DifficultyDistributionChart
								difficultyDistribution={data.difficultyDistribution}
							/>
						</ChartCard>
					</Box>

					{/* Row 5: Question bank (full width) */}
					<ChartCard title="Question Bank">
						<QuestionBankTable recentQuestions={data.recentQuestions} />
					</ChartCard>
				</>
			)}
		</Box>
	);
}
