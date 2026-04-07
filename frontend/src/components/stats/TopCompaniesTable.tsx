import React from "react";
import {
	Box,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { STATUS_COLORS } from "../../constants";
import type { JobStatus } from "../../types";
import CompanyLogo from "../CompanyLogo";

interface TopCompany {
	company: string;
	applications: number;
	active: number;
	bestStage: string;
}

interface Props {
	topCompanies: TopCompany[];
}

export default function TopCompaniesTable({ topCompanies }: Props) {
	if (topCompanies.length === 0) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 120,
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No applications yet
				</Typography>
			</Box>
		);
	}

	return (
		<Table size="small">
			<TableHead>
				<TableRow>
					<TableCell>Company</TableCell>
					<TableCell align="center">Applications</TableCell>
					<TableCell align="center">Active</TableCell>
					<TableCell>Best Stage</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{topCompanies.map((row) => (
					<TableRow key={row.company}>
						<TableCell>
							<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<CompanyLogo company={row.company} />
								<Typography variant="body2" fontWeight={500}>
									{row.company}
								</Typography>
							</Box>
						</TableCell>
						<TableCell align="center">{row.applications}</TableCell>
						<TableCell align="center">{row.active}</TableCell>
						<TableCell>
							<Chip
								label={row.bestStage}
								size="small"
								sx={{
									backgroundColor:
										STATUS_COLORS[row.bestStage as JobStatus] ?? "#90a4ae",
									color: "white",
									fontSize: 11,
									height: 20,
								}}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
