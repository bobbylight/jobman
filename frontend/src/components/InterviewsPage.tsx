import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Link,
	Snackbar,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PhoneIcon from "@mui/icons-material/Phone";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatTime } from "../jobUtils";
import type {
	EnrichedInterview,
	InterviewStage,
	InterviewType,
	InterviewVibe,
} from "../types";

type Severity = "success" | "info" | "warning" | "error";

const PAGE_SIZE = 10;

const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
	onsite: "Onsite",
	phone_screen: "Phone Screen",
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	leadership: "Leadership",
	past_experience: "Past Experience",
	system_design: "System Design",
};

const VIBE_CHIP_SX: Record<InterviewVibe, object> = {
	casual: { bgcolor: "#e3f2fd", color: "#1565c0" },
	intense: { bgcolor: "#fff3e0", color: "#e65100" },
};

const VIBE_LABELS: Record<InterviewVibe, string> = {
	casual: "Casual",
	intense: "Intense",
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

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

	return { from: fmt(today), to: fmt(sundayAfterNext) };
}

type BucketType = "past" | "this_week" | "next_week" | "future";

interface WeekBucket {
	label: string;
	items: EnrichedInterview[];
	isPast: boolean;
	type: BucketType;
}

/**
 * Group interviews into week buckets.
 * "Past" and "Future" buckets are only included when non-empty.
 * "Remaining this week" and "Next week" are always included when the
 * [from, to] date range overlaps with those periods, even if empty.
 */
export function groupByWeek(
	interviews: EnrichedInterview[],
	from: string,
	to: string,
): WeekBucket[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Next Monday = start of next week
	const daysToNextMonday = today.getDay() === 1 ? 7 : (8 - today.getDay()) % 7;
	const nextMonday = new Date(today);
	nextMonday.setDate(today.getDate() + daysToNextMonday);

	// Monday after next = end of next week (exclusive)
	const mondayAfterNext = new Date(nextMonday);
	mondayAfterNext.setDate(nextMonday.getDate() + 7);

	const past: EnrichedInterview[] = [];
	const thisWeek: EnrichedInterview[] = [];
	const nextWeek: EnrichedInterview[] = [];
	const future: EnrichedInterview[] = [];

	for (const iv of interviews) {
		const d = new Date(iv.interview_dttm);
		if (isNaN(d.getTime()) || d < today) {
			past.push(iv);
		} else if (d < nextMonday) {
			thisWeek.push(iv);
		} else if (d < mondayAfterNext) {
			nextWeek.push(iv);
		} else {
			future.push(iv);
		}
	}

	const todayStr = today.toISOString().slice(0, 10);
	const nextMondayStr = nextMonday.toISOString().slice(0, 10);
	const mondayAfterNextStr = mondayAfterNext.toISOString().slice(0, 10);

	// Show "this week" / "next week" if the selected range overlaps each period
	const showThisWeek =
		(from === "" || from < nextMondayStr) && (to === "" || to >= todayStr);
	const showNextWeek =
		(from === "" || from < mondayAfterNextStr) &&
		(to === "" || to >= nextMondayStr);

	const result: WeekBucket[] = [];
	if (past.length > 0) {
		result.push({
			isPast: true,
			items: past,
			label: `Past interviews (${past.length}):`,
			type: "past",
		});
	}
	if (showThisWeek) {
		result.push({
			isPast: false,
			items: thisWeek,
			label: `Remaining this week (${thisWeek.length}):`,
			type: "this_week",
		});
	}
	if (showNextWeek) {
		result.push({
			isPast: false,
			items: nextWeek,
			label: `Next week (${nextWeek.length}):`,
			type: "next_week",
		});
	}
	if (future.length > 0) {
		result.push({
			isPast: false,
			items: future,
			label: `Future (${future.length}):`,
			type: "future",
		});
	}
	return result;
}

export default function InterviewsPage() {
	const navigate = useNavigate();
	const [interviews, setInterviews] = useState<EnrichedInterview[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [reachedEnd, setReachedEnd] = useState(false);
	const [snack, setSnack] = useState<{
		open: boolean;
		message: string;
		severity: Severity;
	}>({ message: "", open: false, severity: "success" });
	const defaults = getDefaultDateRange();
	const [from, setFrom] = useState(defaults.from);
	const [to, setTo] = useState(defaults.to);

	const notify = useCallback(
		(message: string, severity: Severity = "success") =>
			setSnack({ message, open: true, severity }),
		[],
	);

	// When Load More advances `to`, we suppress the re-fetch that would otherwise
	// Be triggered by the date change (the list is already up to date).
	const suppressFetch = useRef(false);

	useEffect(() => {
		if (suppressFetch.current) {
			suppressFetch.current = false;
			return;
		}
		setLoading(true);
		setError(false);
		setReachedEnd(false);
		api
			.searchInterviews(from || undefined, to || undefined)
			.then(setInterviews)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [from, to]);

	const handleLoadMore = useCallback(async () => {
		const last = interviews[interviews.length - 1];
		if (!last) {
			return;
		}
		const lastDttm = last.interview_dttm;
		setLoadingMore(true);
		try {
			const newItems = await api.loadMoreInterviews(lastDttm, PAGE_SIZE);
			if (newItems.length === 0) {
				setReachedEnd(true);
				notify("No more interviews scheduled", "info");
			} else {
				setInterviews((prev) => [...prev, ...newItems]);
				if (newItems.length < PAGE_SIZE) {
					setReachedEnd(true);
				}
				notify(
					`Loaded ${newItems.length} new interview${newItems.length !== 1 ? "s" : ""}`,
				);
				// Advance the "To" date to cover the newly loaded interviews,
				// Suppressing the re-fetch that the state change would normally trigger.
				const lastNew = newItems[newItems.length - 1];
				if (lastNew) {
					const newToDate = lastNew.interview_dttm.slice(0, 10);
					if (newToDate > to) {
						suppressFetch.current = true;
						setTo(newToDate);
					}
				}
			}
		} catch {
			notify("Failed to load more interviews", "error");
		} finally {
			setLoadingMore(false);
		}
	}, [interviews, notify, to]);

	const grouped = groupByWeek(interviews, from, to);

	const loadMoreControl = loadingMore ? (
		<CircularProgress size={24} />
	) : (
		<Button
			variant="outlined"
			size="small"
			onClick={() => void handleLoadMore()}
		>
			Load More
		</Button>
	);

	return (
		<>
			<Box sx={{ maxWidth: 860, mx: "auto", px: 3, py: 4 }}>
				{/* Header */}
				<Box
					sx={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: 2,
						mb: 3,
					}}
				>
					<Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
						Upcoming Interviews
					</Typography>
					<Box sx={{ alignItems: "center", display: "flex", gap: 1.5 }}>
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
				) : null}
				{!loading && grouped.length === 0 && (
					<Typography
						variant="body2"
						color="text.disabled"
						sx={{ textAlign: "center", mt: 10 }}
					>
						No interviews found in this date range.
					</Typography>
				)}
				{!loading &&
					grouped.length > 0 &&
					grouped.map(({ label, items, isPast }) => {
						// Group by calendar day
						const dayMap = new Map<string, EnrichedInterview[]>();
						for (const iv of items) {
							const key = new Date(iv.interview_dttm).toDateString();
							if (!dayMap.has(key)) {
								dayMap.set(key, []);
							}
							dayMap.get(key)!.push(iv);
						}

						return (
							<Box key={label} sx={{ mb: 3 }}>
								<Typography
									variant="subtitle2"
									color="text.secondary"
									sx={{ display: "block", mb: 1 }}
								>
									{label}
								</Typography>

								{items.length === 0 ? (
									<Typography
										variant="body2"
										color="text.disabled"
										sx={{ textAlign: "center", py: 1.5 }}
									>
										No interviews this week
									</Typography>
								) : (
									[...dayMap.entries()].map(([dateStr, dayItems]) => {
										const d = new Date(dateStr);
										const isToday =
											d.toDateString() === new Date().toDateString();
										const weekday = d.toLocaleDateString("en-US", {
											weekday: "short",
										});
										const dateLabel = d.toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
										});
										return (
											<Box
												key={dateStr}
												sx={{ display: "flex", alignItems: "stretch", mb: 1.5 }}
											>
												{/* Left rail: day label */}
												<Box
													sx={{
														width: 48,
														flexShrink: 0,
														textAlign: "right",
														pr: 1.5,
														pt: 0.5,
													}}
												>
													<Typography
														variant="caption"
														fontWeight={600}
														color={isToday ? "primary.main" : "text.secondary"}
														sx={{ display: "block", lineHeight: 1.3 }}
													>
														{weekday}
													</Typography>
													<Typography
														variant="caption"
														color={isToday ? "primary.main" : "text.disabled"}
														sx={{
															display: "block",
															lineHeight: 1.3,
															fontSize: "0.65rem",
														}}
													>
														{dateLabel}
													</Typography>
												</Box>
												{/* Vertical line */}
												<Box
													sx={{
														width: "2px",
														flexShrink: 0,
														mr: 1.5,
														borderRadius: "2px",
														bgcolor: isToday ? "primary.light" : "divider",
													}}
												/>
												{/* Cards */}
												<Box sx={{ flex: 1, minWidth: 0 }}>
													{dayItems.map((iv) => (
														<InterviewRow
															key={iv.id}
															interview={iv}
															onJobClick={() => navigate(`/jobs/${iv.job.id}`)}
															dimmed={isPast}
														/>
													))}
												</Box>
											</Box>
										);
									})
								)}
							</Box>
						);
					})}

				{!loading && !error && interviews.length > 0 && (
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexDirection: "column",
							gap: 1.5,
							mt: 2,
						}}
					>
						<Typography variant="caption" color="text.disabled">
							{interviews.length} interview{interviews.length !== 1 ? "s" : ""}
						</Typography>
						{reachedEnd ? (
							<Typography variant="body2" color="text.disabled">
								No more scheduled interviews
							</Typography>
						) : (
							loadMoreControl
						)}
					</Box>
				)}
			</Box>

			<Snackbar
				open={snack.open}
				autoHideDuration={3000}
				onClose={() => setSnack((s) => ({ ...s, open: false }))}
				anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
			>
				<Alert
					severity={snack.severity}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snack.message}
				</Alert>
			</Snackbar>
		</>
	);
}

function InterviewRow({
	interview,
	onJobClick,
	dimmed = false,
}: {
	interview: EnrichedInterview;
	onJobClick: () => void;
	dimmed?: boolean;
}) {
	const TypeIcon =
		interview.interview_stage === "phone_screen" ? PhoneIcon : BusinessIcon;
	const typeLabel = INTERVIEW_STAGE_LABELS[interview.interview_stage];

	return (
		<Box
			data-testid="interview-card"
			data-dimmed={String(dimmed)}
			sx={{
				alignItems: "flex-start",
				bgcolor: dimmed ? "action.hover" : "background.paper",
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 1,
				display: "flex",
				gap: 1.5,
				mb: 1,
				p: 1.5,
			}}
		>
			<TypeIcon
				sx={{ color: "text.secondary", flexShrink: 0, fontSize: 18, mt: 0.25 }}
			/>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				{/* Top row: type + date + vibe */}
				<Box
					sx={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: 1,
					}}
				>
					<Typography variant="body2" fontWeight={600}>
						{typeLabel}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						&middot; {formatTime(interview.interview_dttm)}
					</Typography>
					{interview.interview_type && (
						<Chip
							label={INTERVIEW_TYPE_LABELS[interview.interview_type]}
							size="small"
							sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a" }}
						/>
					)}
					{interview.interview_vibe && (
						<Chip
							label={VIBE_LABELS[interview.interview_vibe]}
							size="small"
							sx={VIBE_CHIP_SX[interview.interview_vibe]}
						/>
					)}
				</Box>

				{/* Job link */}
				<Box sx={{ alignItems: "center", display: "flex", gap: 0.5, mt: 0.25 }}>
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
							sx={{ color: "text.disabled", display: "flex" }}
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
