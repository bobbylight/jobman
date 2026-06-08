import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import type { Job, Offer } from "../../types";
import {
	computeOngoingTC,
	computeYear1TC,
	formatCurrency,
} from "../../offerUtils";
import CompanyLogo from "../shared/CompanyLogo";

interface Props {
	job: Job;
	offer: Offer | null;
}

export default function OfferSummaryCard({ job, offer }: Props) {
	return (
		<Card sx={{ flex: "1 1 220px", maxWidth: 280 }}>
			<CardContent>
				<Box sx={{ alignItems: "center", display: "flex", gap: 1, mb: 1.5 }}>
					<CompanyLogo company={job.company} size={28} />
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
							{job.company}
						</Typography>
						<Typography variant="caption" color="text.secondary" noWrap>
							{job.role}
						</Typography>
					</Box>
				</Box>

				{offer === null ? (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ fontStyle: "italic" }}
					>
						No offer recorded
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
						<Box sx={{ alignItems: "baseline", display: "flex", gap: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Year 1 TC
							</Typography>
							<Typography variant="h6" sx={{ fontWeight: 700 }}>
								{formatCurrency(computeYear1TC(offer))}
							</Typography>
						</Box>
						<Box sx={{ alignItems: "baseline", display: "flex", gap: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Ongoing TC
							</Typography>
							<Typography variant="body1" sx={{ fontWeight: 600 }}>
								{formatCurrency(computeOngoingTC(offer))}
							</Typography>
						</Box>
					</Box>
				)}
			</CardContent>
		</Card>
	);
}
