import React, { useState } from "react";
import {
	Box,
	Chip,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
	behavioral: { bg: "#e8f5e9", color: "#2e7d32" },
	coding: { bg: "#e3f2fd", color: "#1565c0" },
	culture_fit: { bg: "#fce4ec", color: "#c62828" },
	system_design: { bg: "#f3e5f5", color: "#6a1b9a" },
	technical: { bg: "#fff3e0", color: "#e65100" },
};

const TYPE_LABELS: Record<string, string> = {
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	system_design: "System Design",
	technical: "Technical",
};

function DifficultyStars({ difficulty }: { difficulty: number }) {
	return (
		<Box sx={{ display: "flex", gap: "1px", whiteSpace: "nowrap" }}>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					style={{
						color: i < difficulty ? "#ffa726" : "#e0e0e0",
						fontSize: 14,
					}}
				>
					★
				</span>
			))}
		</Box>
	);
}

function ResultIcon({ result }: { result: string | null }) {
	if (result === "passed") {
		return <CheckIcon sx={{ color: "#66bb6a", fontSize: 18 }} />;
	}
	if (result === "failed") {
		return <CloseIcon sx={{ color: "#ef5350", fontSize: 18 }} />;
	}
	return <RemoveIcon sx={{ color: "#bdbdbd", fontSize: 18 }} />;
}

interface Question {
	id: number;
	question_text: string;
	question_type: string;
	question_notes: string | null;
	difficulty: number;
	interview_result: string | null;
	company: string;
	role: string;
	interview_dttm: string;
}

interface Props {
	recentQuestions: Question[];
}

export default function QuestionBankTable({ recentQuestions }: Props) {
	const [typeFilter, setTypeFilter] = useState<string>("all");

	if (recentQuestions.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 120,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No questions recorded yet
				</Typography>
			</Box>
		);
	}

	const types = [
		...new Set(recentQuestions.map((q) => q.question_type)),
	].toSorted();
	const filtered =
		typeFilter === "all"
			? recentQuestions
			: recentQuestions.filter((q) => q.question_type === typeFilter);

	return (
		<Box>
			<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
				<FormControl size="small" sx={{ minWidth: 140 }}>
					<InputLabel>Type</InputLabel>
					<Select
						value={typeFilter}
						label="Type"
						onChange={(e) => setTypeFilter(e.target.value)}
					>
						<MenuItem value="all">All types</MenuItem>
						{types.map((t) => (
							<MenuItem key={t} value={t}>
								{TYPE_LABELS[t] ?? t}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell sx={{ fontWeight: 600, width: 90 }}>
							Difficulty
						</TableCell>
						<TableCell sx={{ fontWeight: 600, width: 120 }}>Type</TableCell>
						<TableCell sx={{ fontWeight: 600 }}>Question</TableCell>
						<TableCell sx={{ fontWeight: 600, width: 160 }}>Company</TableCell>
						<TableCell sx={{ fontWeight: 600, width: 50 }} align="center">
							Result
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{filtered.map((q) => {
						const chipStyle = TYPE_COLORS[q.question_type] ?? {
							bg: "#f5f5f5",
							color: "#616161",
						};
						return (
							<TableRow key={q.id} hover>
								<TableCell>
									<DifficultyStars difficulty={q.difficulty} />
								</TableCell>
								<TableCell>
									<Chip
										label={TYPE_LABELS[q.question_type] ?? q.question_type}
										size="small"
										sx={{
											bgcolor: chipStyle.bg,
											color: chipStyle.color,
											fontWeight: 500,
										}}
									/>
								</TableCell>
								<TableCell>
									<Tooltip
										title={
											q.question_notes
												? `${q.question_text}\n\nNotes: ${q.question_notes}`
												: q.question_text
										}
										placement="top-start"
										slotProps={{
											tooltip: {
												sx: { whiteSpace: "pre-wrap", maxWidth: 400 },
											},
										}}
									>
										<Typography
											variant="body2"
											sx={{
												cursor: "default",
												maxWidth: 360,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{q.question_text}
										</Typography>
									</Tooltip>
								</TableCell>
								<TableCell>
									<Typography variant="body2" noWrap>
										{q.company}
									</Typography>
									<Typography variant="caption" color="text.secondary" noWrap>
										{q.role}
									</Typography>
								</TableCell>
								<TableCell align="center">
									<ResultIcon result={q.interview_result} />
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</Box>
	);
}
