import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

const DURATION = 600;
const INTERVAL = 20;

interface Props {
	label: string;
	value: number | null;
	suffix?: string;
	subtitle?: string;
}

export default function StatCard({ label, value, suffix, subtitle }: Props) {
	const [displayed, setDisplayed] = useState(0);

	useEffect(() => {
		if (value === null || value === 0) {
			setDisplayed(0);
			return;
		}

		const steps = Math.ceil(DURATION / INTERVAL);
		const increment = value / steps;
		let current = 0;

		const timer = setInterval(() => {
			current += increment;
			if (current >= value) {
				setDisplayed(value);
				clearInterval(timer);
			} else {
				setDisplayed(Math.round(current));
			}
		}, INTERVAL);

		return () => clearInterval(timer);
	}, [value]);

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
						{value === null ? "—" : `${displayed}${suffix ?? ""}`}
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
