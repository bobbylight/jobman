import React from "react";
import {
	Card,
	CardContent,
	Typography,
	type SxProps,
	type Theme,
} from "@mui/material";

interface Props {
	title: string;
	children: React.ReactNode;
	sx?: SxProps<Theme>;
}

export default function ChartCard({ title, children, sx }: Props) {
	return (
		<Card sx={sx}>
			<CardContent>
				<Typography variant="subtitle2" color="text.secondary" gutterBottom>
					{title}
				</Typography>
				{children}
			</CardContent>
		</Card>
	);
}
