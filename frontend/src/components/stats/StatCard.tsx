import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

interface Props {
	label: string;
	value: string | number;
	subtitle?: string;
}

export default function StatCard({ label, value, subtitle }: Props) {
	return (
		<Card sx={{ flex: 1, minWidth: 160 }}>
			<CardContent sx={{ pb: "16px !important" }}>
				<Typography
					variant="overline"
					color="text.secondary"
					sx={{ lineHeight: 1.2, display: "block", mb: 0.5 }}
				>
					{label}
				</Typography>
				<Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
					<Typography variant="h4" fontWeight={700} lineHeight={1}>
						{value}
					</Typography>
				</Box>
				{subtitle && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ mt: 0.5, display: "block" }}
					>
						{subtitle}
					</Typography>
				)}
			</CardContent>
		</Card>
	);
}
