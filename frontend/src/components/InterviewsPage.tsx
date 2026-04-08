import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Link,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PhoneIcon from "@mui/icons-material/Phone";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { EnrichedInterview, InterviewType, InterviewVibe } from "../types";

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
	phone_screen: "Phone Screen",
	onsite: "Onsite",
};

const VIBE_CHIP_SX: Record<InterviewVibe, object> = {
	casual: { bgcolor: "#e3f2fd", color: "#1565c0" },
	intense: { bgcolor: "#fff3e0", color: "#e65100" },
};

const VIBE_LABELS: Record<InterviewVibe, string> = {
	casual: "Casual",
	intense: "Intense",
};

function formatDttm(dttm: string): string {
	const d = new Date(dttm);
	if (isNaN(d.getTime())) return dttm;
	return d.toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Returns {from, to} strings (YYYY-MM-DD) covering today through the Sunday
 * after next Sunday — i.e. "this week and next week".
 */
export function getDefaultDateRange(): { from: string; to: string } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Days until the next Sunday (if today is Sunday, that's 7 days away)
	const daysToNextSunday = today.getDay() === 0 ? 7 : 7 - today.getDay();
	const nextSunday = new Date(today);
	nextSunday.setDate(today.getDate() + daysToNextSunday);

	const sundayAfterNext = new Date(nextSunday);
	sundayAfterNext.setDate(nextSunday.getDate() + 7);

	const fmt = (d: Date) => d.toISOString().slice(0, 10);
	return { from: fmt(today), to: fmt(sundayAfterNext) };
}

/** Group interviews by calendar month, returning entries in order. */
function groupByMonth(
	interviews: EnrichedInterview[],
): { month: string; items: EnrichedInterview[] }[] {
	const map = new Map<string, EnrichedInterview[]>();
	for (const iv of interviews) {
		const d = new Date(iv.interview_dttm);
		const key = isNaN(d.getTime())
			? "Unknown"
			: d.toLocaleString("en-US", { month: "long", year: "numeric" });
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(iv);
	}
	return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
}

export default function InterviewsPage() {
	const navigate = useNavigate();
	const [interviews, setInterviews] = useState<EnrichedInterview[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const defaults = getDefaultDateRange();
	const [from, setFrom] = useState(defaults.from);
	const [to, setTo] = useState(defaults.to);

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.searchInterviews(from || undefined, to || undefined)
			.then(setInterviews)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [from, to]);

	const grouped = groupByMonth(interviews);

	return (
		<Box sx={{ maxWidth: 860, mx: "auto", px: 3, py: 4 }}>
			{/* Header */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					flexWrap: "wrap",
					gap: 2,
					mb: 3,
				}}
			>
				<Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
					Upcoming Interviews
				</Typography>
				<Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
					<TextField
						label="From"
						type="date"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
						sx={{ width: 160 }}
					/>
					<TextField
						label="To"
						type="date"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
						sx={{ width: 160 }}
					/>
					{(from !== defaults.from || to !== defaults.to) && (
						<Button
							size="small"
							variant="text"
							onClick={() => {
								setFrom(defaults.from);
								setTo(defaults.to);
							}}
						>
							Reset
						</Button>
					)}
				</Box>
			</Box>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load interviews. Please try again.
				</Typography>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			) : interviews.length === 0 ? (
				<Typography
					variant="body2"
					color="text.disabled"
					sx={{ textAlign: "center", mt: 10 }}
				>
					{from !== defaults.from || to !== defaults.to
						? "No interviews found in this date range."
						: "No upcoming interviews."}
				</Typography>
			) : (
				grouped.map(({ month, items }) => (
					<Box key={month} sx={{ mb: 3 }}>
						<Typography
							variant="overline"
							color="text.secondary"
							sx={{ display: "block", mb: 1 }}
						>
							{month}
						</Typography>
						{items.map((iv) => (
							<InterviewRow
								key={iv.id}
								interview={iv}
								onJobClick={() => navigate(`/jobs/${iv.job.id}`)}
							/>
						))}
					</Box>
				))
			)}

			{!loading && !error && interviews.length > 0 && (
				<Typography
					variant="caption"
					color="text.disabled"
					sx={{ display: "block", textAlign: "right", mt: 1 }}
				>
					{interviews.length} interview{interviews.length !== 1 ? "s" : ""}
				</Typography>
			)}
		</Box>
	);
}

function InterviewRow({
	interview,
	onJobClick,
}: {
	interview: EnrichedInterview;
	onJobClick: () => void;
}) {
	const TypeIcon =
		interview.interview_type === "phone_screen" ? PhoneIcon : BusinessIcon;
	const typeLabel = INTERVIEW_TYPE_LABELS[interview.interview_type];

	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 1,
				p: 1.5,
				mb: 1,
				display: "flex",
				gap: 1.5,
				alignItems: "flex-start",
				bgcolor: "background.paper",
			}}
		>
			<TypeIcon
				sx={{ fontSize: 18, color: "text.secondary", mt: 0.25, flexShrink: 0 }}
			/>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				{/* Top row: type + date + vibe */}
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						flexWrap: "wrap",
					}}
				>
					<Typography variant="body2" fontWeight={600}>
						{typeLabel}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						&middot; {formatDttm(interview.interview_dttm)}
					</Typography>
					{interview.interview_vibe && (
						<Chip
							label={VIBE_LABELS[interview.interview_vibe]}
							size="small"
							sx={VIBE_CHIP_SX[interview.interview_vibe]}
						/>
					)}
				</Box>

				{/* Job link */}
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
					<Link
						component="button"
						variant="caption"
						underline="hover"
						onClick={onJobClick}
						sx={{ fontWeight: 500 }}
					>
						{interview.job.company} &middot; {interview.job.role}
					</Link>
					<Tooltip title="Open job posting">
						<Link
							href={interview.job.link}
							target="_blank"
							rel="noopener noreferrer"
							sx={{ display: "flex", color: "text.disabled" }}
							aria-label="Open job posting"
						>
							<OpenInNewIcon sx={{ fontSize: 12 }} />
						</Link>
					</Tooltip>
				</Box>

				{interview.interview_interviewers && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ display: "block", mt: 0.25 }}
					>
						{interview.interview_interviewers}
					</Typography>
				)}
				{interview.interview_notes && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							display: "block",
							mt: 0.25,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{interview.interview_notes.split("\n")[0]}
					</Typography>
				)}
			</Box>
		</Box>
	);
}
