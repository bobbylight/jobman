import React, { useEffect, useState } from "react";
import {
	Box,
	Card,
	CardContent,
	CircularProgress,
	Typography,
} from "@mui/material";
import { api } from "../api";
import type { InterviewInsightsResponse, StatsWindow } from "../types";
import StatCard from "./stats/StatCard";
import LookbackToggle from "./stats/LookbackToggle";
import TypeDonutChart from "./insights/TypeDonutChart";
import PassRateByTypeChart from "./insights/PassRateByTypeChart";
import FeelingCalibrationChart from "./insights/FeelingCalibrationChart";
import QuestionsByTypeChart from "./insights/QuestionsByTypeChart";
import DifficultyDistributionChart from "./insights/DifficultyDistributionChart";
import QuestionBankTable from "./insights/QuestionBankTable";

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
				<Typography variant="h5" fontWeight={700}>
					Interview Insights
				</Typography>
				<LookbackToggle value={window} onChange={setWindow} />
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load insights. Please try again.
				</Typography>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			) : null}

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
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Interview Types
								</Typography>
								<TypeDonutChart byType={data.byType} />
							</CardContent>
						</Card>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Pass Rate by Type
								</Typography>
								<PassRateByTypeChart byType={data.byType} />
							</CardContent>
						</Card>
					</Box>

					{/* Row 3: Feeling calibration (full width) */}
					<Box sx={{ mb: 2 }}>
						<Card>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									How Well Does Your Gut Predict Outcome?
								</Typography>
								<FeelingCalibrationChart
									feelingVsResult={data.feelingVsResult}
								/>
							</CardContent>
						</Card>
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
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Questions by Type
								</Typography>
								<QuestionsByTypeChart questionsByType={data.questionsByType} />
							</CardContent>
						</Card>
						<Card sx={{ flex: "1 1 340px" }}>
							<CardContent>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									gutterBottom
								>
									Question Difficulty by Interview Outcome
								</Typography>
								<DifficultyDistributionChart
									difficultyDistribution={data.difficultyDistribution}
								/>
							</CardContent>
						</Card>
					</Box>

					{/* Row 5: Question bank (full width) */}
					<Card>
						<CardContent>
							<Typography
								variant="subtitle2"
								color="text.secondary"
								gutterBottom
							>
								Question Bank
							</Typography>
							<QuestionBankTable recentQuestions={data.recentQuestions} />
						</CardContent>
					</Card>
				</>
			)}
		</Box>
	);
}
