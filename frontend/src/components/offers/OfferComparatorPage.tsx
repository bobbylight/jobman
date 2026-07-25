import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	FormControlLabel,
	Switch,
	Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import type { OfferComparisonEntry } from "../../types";
import ChartCard from "../shared/ChartCard";
import PageSpinner from "../shared/PageSpinner";
import OfferSummaryCard from "./OfferSummaryCard";
import OfferComparisonTable from "./OfferComparisonTable";
import OfferBreakdownChart from "./OfferBreakdownChart";
import { useActiveSearch } from "../../useActiveSearch";

export default function OfferComparatorPage() {
	const navigate = useNavigate();
	const [entries, setEntries] = useState<OfferComparisonEntry[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [allRounds, setAllRounds] = useState(false);
	const { activeSearch } = useActiveSearch();

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.getOffersComparison(allRounds ? "all" : "current")
			.then(setEntries)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [allRounds]);

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 4 }}>
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
						Offer Comparator
					</Typography>
					{activeSearch && !allRounds && (
						<Chip label={activeSearch.name} size="small" />
					)}
				</Box>
				<FormControlLabel
					control={
						<Switch
							checked={allRounds}
							onChange={(e) => setAllRounds(e.target.checked)}
							size="small"
						/>
					}
					label="Include past rounds"
					sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
				/>
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load offers. Please try again.
				</Typography>
			)}

			{loading ? <PageSpinner /> : null}

			{!loading && entries && entries.length === 0 && (
				<Box
					sx={{
						alignItems: "center",
						display: "flex",
						flexDirection: "column",
						gap: 1.5,
						py: 8,
						textAlign: "center",
					}}
				>
					{allRounds ? (
						<>
							<Typography variant="body1" color="text.secondary">
								You don't have any jobs in the Offer column yet.
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Move a job to "Offer!" on the Kanban board to start comparing
								offers.
							</Typography>
						</>
					) : (
						<>
							<Typography variant="body1" color="text.secondary">
								No offers in your current search.
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Move a job to "Offer!" on the Kanban board, or turn on "Include
								past rounds" above if you're comparing an offer from an earlier
								search.
							</Typography>
						</>
					)}
					<Button variant="contained" onClick={() => navigate("/jobs")}>
						Go to Kanban Board
					</Button>
				</Box>
			)}

			{!loading && entries && entries.length > 0 && (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
						{entries.map(({ job, offer }) => (
							<OfferSummaryCard
								key={job.id}
								job={job}
								offer={offer}
								{...(job.search_name ? { searchName: job.search_name } : {})}
							/>
						))}
					</Box>

					<ChartCard title="Compensation Comparison">
						<OfferComparisonTable entries={entries} />
					</ChartCard>

					<ChartCard title="TC Breakdown">
						<OfferBreakdownChart entries={entries} />
					</ChartCard>
				</Box>
			)}
		</Box>
	);
}
