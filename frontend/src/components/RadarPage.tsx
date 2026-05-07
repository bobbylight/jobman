import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	FormControlLabel,
	Link,
	Switch,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { fetchLogo, getCachedLogo } from "../logoCache";
import type { RadarEntry, RadarPatch, RadarResponse } from "../types";

type TabValue = "all" | "eligible" | "active" | "cooling_down";

const TIER_CHIP_SX = {
	faang: {
		bgcolor: "#fce4ec",
		color: "#c62828",
		fontSize: "0.6rem",
		height: 16,
	},
	faang_adjacent: {
		bgcolor: "#e8eaf6",
		color: "#283593",
		fontSize: "0.6rem",
		height: 16,
	},
	custom: {
		bgcolor: "#f3e5f5",
		color: "#6a1b9a",
		fontSize: "0.6rem",
		height: 16,
	},
};

const TIER_LABELS: Record<string, string> = {
	faang: "FAANG",
	faang_adjacent: "Adjacent",
	custom: "Custom",
};

const CONFIDENCE_LABELS: Record<string, string> = {
	official: "official source",
	community: "community reports",
	estimate: "estimate",
};

const CONFIDENCE_COLORS: Record<string, string> = {
	official: "#2e7d32",
	community: "#1565c0",
	estimate: "#e65100",
};

function formatDays(days: number): string {
	if (days >= 365 && days % 365 === 0) {
		return `${days / 365} yr`;
	}
	if (days >= 30) {
		return `${Math.round(days / 30)} mo`;
	}
	return `${days}d`;
}

function lastActivityDate(entry: RadarEntry): string | null {
	const candidates = [
		entry.last_application_date,
		entry.last_interview_date?.slice(0, 10) ?? null,
	].filter(Boolean) as string[];
	if (candidates.length === 0) {
		return null;
	}
	return candidates.reduce((a, b) => (a > b ? a : b));
}

function formatActivityDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}

// ── Eligibility chip ──────────────────────────────────────────────────────────

function EligibilityChip({ entry }: { entry: RadarEntry }) {
	if (entry.eligibility === "limit_reached") {
		return (
			<Tooltip
				title={
					entry.unlock_date
						? `A slot opens on ${entry.unlock_date}`
						: "Per-period application limit reached"
				}
			>
				<Chip
					label={
						entry.days_until_unlock
							? `App Limit · slot in ${entry.days_until_unlock}d`
							: "App Limit Reached"
					}
					size="small"
					sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a", fontWeight: 600 }}
				/>
			</Tooltip>
		);
	}
	if (entry.eligibility === "active") {
		return (
			<Chip
				label="Active Pipeline"
				size="small"
				color="primary"
				sx={{ fontWeight: 600 }}
			/>
		);
	}
	if (entry.eligibility === "cooling_down") {
		const long = (entry.days_until_unlock ?? 0) > 180;
		return (
			<Tooltip title={`Unlocks ${entry.unlock_date ?? ""}`}>
				<Chip
					label={`Unlock in ${entry.days_until_unlock}d`}
					size="small"
					sx={{
						bgcolor: long ? "#ffebee" : "#fff3e0",
						color: long ? "#c62828" : "#e65100",
						fontWeight: 600,
					}}
				/>
			</Tooltip>
		);
	}
	if (entry.eligibility === "clear") {
		return (
			<Chip
				label="Clear to Apply"
				size="small"
				sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
			/>
		);
	}
	return (
		<Chip
			label="No History"
			size="small"
			sx={{ bgcolor: "#f5f5f5", color: "#9e9e9e" }}
		/>
	);
}

// ── Company logo ──────────────────────────────────────────────────────────────

function CompanyLogo({ company }: { company: string }) {
	const [entry, setEntry] = useState(() => getCachedLogo(company));
	useEffect(() => {
		void fetchLogo(company).then(setEntry);
	}, [company]);

	if (!entry || entry.status !== "resolved") {
		return <Box sx={{ width: 20, height: 20, flexShrink: 0 }} />;
	}
	return (
		<Box
			component="img"
			src={entry.src}
			alt={company}
			sx={{
				borderRadius: 0.5,
				flexShrink: 0,
				height: 20,
				objectFit: "contain",
				width: 20,
			}}
		/>
	);
}

// ── Radar row ─────────────────────────────────────────────────────────────────

function RadarRow({
	entry,
	expanded,
	onToggle,
	onUpdate,
}: {
	entry: RadarEntry;
	expanded: boolean;
	onToggle: () => void;
	onUpdate: (patch: RadarPatch) => void;
}) {
	const navigate = useNavigate();
	const [notes, setNotes] = useState(entry.user_notes ?? "");

	// Keep notes in sync if parent re-renders the entry (e.g. after patch)
	useEffect(() => {
		setNotes(entry.user_notes ?? "");
	}, [entry.user_notes]);

	const activity = lastActivityDate(entry);
	const { policy } = entry;
	const hasCooldownData =
		policy.application_cooldown_days !== null ||
		policy.phone_screen_cooldown_days !== null ||
		policy.onsite_cooldown_days !== null;

	return (
		<Box sx={{ mb: expanded ? 0 : 0.75 }}>
			{/* Summary row */}
			<Box
				onClick={onToggle}
				sx={{
					alignItems: "center",
					bgcolor: "background.paper",
					border: "1px solid",
					borderBottom: expanded ? "none" : undefined,
					borderColor: expanded ? "primary.light" : "divider",
					borderRadius: expanded ? "8px 8px 0 0" : 1,
					cursor: "pointer",
					display: "flex",
					gap: 1.5,
					px: 1.5,
					py: 1,
					"&:hover": { bgcolor: "action.hover" },
				}}
			>
				<CompanyLogo company={entry.name} />

				{/* Name + tier */}
				<Box
					sx={{
						alignItems: "center",
						display: "flex",
						gap: 0.75,
						width: 180,
						flexShrink: 0,
					}}
				>
					<Typography variant="body2" fontWeight={600} noWrap>
						{entry.name}
					</Typography>
					<Chip
						label={TIER_LABELS[entry.tier] ?? entry.tier}
						size="small"
						sx={TIER_CHIP_SX[entry.tier] ?? TIER_CHIP_SX.custom}
					/>
				</Box>

				{/* Farthest stage */}
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ flex: 1, minWidth: 0 }}
					noWrap
				>
					{entry.latest_active_status ?? "—"}
				</Typography>

				{/* Last activity */}
				<Typography
					variant="caption"
					color="text.disabled"
					sx={{ flexShrink: 0, width: 72, textAlign: "right" }}
				>
					{activity ? formatActivityDate(activity) : "—"}
				</Typography>

				{/* Eligibility chip */}
				<Box
					sx={{
						flexShrink: 0,
						width: 148,
						display: "flex",
						justifyContent: "flex-end",
					}}
				>
					<EligibilityChip entry={entry} />
				</Box>

				<ExpandMoreIcon
					sx={{
						color: "text.disabled",
						flexShrink: 0,
						fontSize: 18,
						transform: expanded ? "rotate(180deg)" : "none",
						transition: "transform 0.2s",
					}}
				/>
			</Box>

			{/* Expansion panel */}
			<Collapse in={expanded}>
				<Box
					sx={{
						bgcolor: "background.paper",
						border: "1px solid",
						borderColor: "primary.light",
						borderRadius: "0 0 8px 8px",
						borderTop: "none",
						mb: 0.75,
						px: 2,
						py: 1.5,
					}}
				>
					{/* Policy details */}
					<Typography variant="caption" fontWeight={600} color="text.secondary">
						Cooldown Policy
					</Typography>
					{hasCooldownData ? (
						<Box
							sx={{
								display: "flex",
								flexWrap: "wrap",
								gap: 2,
								mt: 0.5,
								mb: 0.5,
							}}
						>
							{policy.application_cooldown_days !== null && (
								<Box>
									<Typography
										variant="caption"
										color="text.disabled"
										display="block"
									>
										After application
									</Typography>
									<Typography variant="body2" fontWeight={500}>
										{formatDays(policy.application_cooldown_days)}
									</Typography>
								</Box>
							)}
							{policy.phone_screen_cooldown_days !== null && (
								<Box>
									<Typography
										variant="caption"
										color="text.disabled"
										display="block"
									>
										After phone screen rejection
									</Typography>
									<Typography variant="body2" fontWeight={500}>
										{formatDays(policy.phone_screen_cooldown_days)}
									</Typography>
								</Box>
							)}
							{policy.onsite_cooldown_days !== null && (
								<Box>
									<Typography
										variant="caption"
										color="text.disabled"
										display="block"
									>
										After onsite rejection
									</Typography>
									<Typography variant="body2" fontWeight={500}>
										{formatDays(policy.onsite_cooldown_days)}
									</Typography>
								</Box>
							)}
							{policy.max_apps_per_period !== null &&
								policy.apps_period_days !== null && (
									<Box>
										<Typography
											variant="caption"
											color="text.disabled"
											display="block"
										>
											Application limit
										</Typography>
										<Typography variant="body2" fontWeight={500}>
											{policy.max_apps_per_period} per{" "}
											{formatDays(policy.apps_period_days)}
										</Typography>
									</Box>
								)}
						</Box>
					) : (
						<Typography
							variant="body2"
							color="text.disabled"
							sx={{ mt: 0.5, mb: 0.5 }}
						>
							No policy data — run the populate-radar-policies skill to fetch.
						</Typography>
					)}

					{/* Source + confidence + updated date */}
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexWrap: "wrap",
							gap: 1,
							mt: 0.5,
						}}
					>
						{policy.confidence && (
							<Typography
								variant="caption"
								sx={{ color: CONFIDENCE_COLORS[policy.confidence] }}
							>
								{CONFIDENCE_LABELS[policy.confidence]}
							</Typography>
						)}
						{policy.url && (
							<Link
								href={policy.url}
								target="_blank"
								rel="noopener noreferrer"
								variant="caption"
								sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
							>
								source <OpenInNewIcon sx={{ fontSize: 10 }} />
							</Link>
						)}
						{policy.updated_at && (
							<Typography variant="caption" color="text.disabled">
								· Data updated:{" "}
								{new Date(policy.updated_at).toLocaleDateString("en-US", {
									month: "long",
									day: "numeric",
									year: "numeric",
								})}
							</Typography>
						)}
					</Box>

					{/* Job history */}
					{entry.jobs.length > 0 && (
						<Box sx={{ mt: 1.5 }}>
							<Typography
								variant="caption"
								fontWeight={600}
								color="text.secondary"
							>
								Application History
							</Typography>
							<Box
								sx={{
									mt: 0.5,
									display: "flex",
									flexDirection: "column",
									gap: 0.25,
								}}
							>
								{entry.jobs.map((job) => (
									<Box
										key={job.id}
										sx={{ alignItems: "center", display: "flex", gap: 1 }}
									>
										<Link
											component="button"
											variant="caption"
											underline="hover"
											onClick={() => navigate(`/jobs/${job.id}`)}
											sx={{ fontWeight: 500 }}
										>
											{job.role}
										</Link>
										<Typography variant="caption" color="text.disabled">
											· {job.status}
											{job.date_applied
												? ` · ${job.date_applied.slice(0, 10)}`
												: ""}
										</Typography>
									</Box>
								))}
							</Box>
						</Box>
					)}

					{/* Notes */}
					<TextField
						label="Notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						onBlur={() => {
							const next = notes.trim() || null;
							if (next !== (entry.user_notes ?? null)) {
								onUpdate({ user_notes: next });
							}
						}}
						size="small"
						fullWidth
						multiline
						minRows={2}
						placeholder="Personal notes about this company…"
						sx={{ mt: 1.5 }}
					/>

					{/* Hide toggle */}
					{entry.hidden ? (
						<Button
							size="small"
							variant="outlined"
							sx={{ mt: 1 }}
							onClick={() => onUpdate({ hidden: 0 })}
						>
							Restore to radar
						</Button>
					) : (
						<FormControlLabel
							control={
								<Switch
									size="small"
									checked={false}
									onChange={() => onUpdate({ hidden: 1 })}
								/>
							}
							label={
								<Typography variant="caption" color="text.secondary">
									Hide from radar
								</Typography>
							}
							sx={{ mt: 0.5, ml: 0 }}
						/>
					)}
				</Box>
			</Collapse>
		</Box>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RadarPage() {
	const [data, setData] = useState<RadarResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [tab, setTab] = useState<TabValue>("all");
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [showHidden, setShowHidden] = useState(false);

	useEffect(() => {
		setLoading(true);
		setError(false);
		api
			.getRadar(showHidden)
			.then(setData)
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, [showHidden]);

	const counts = useMemo(
		() => ({
			active:
				data?.entries.filter((e) => e.eligibility === "active").length ?? 0,
			limit_reached:
				data?.entries.filter((e) => e.eligibility === "limit_reached").length ??
				0,
			cooling_down:
				data?.entries.filter((e) => e.eligibility === "cooling_down").length ??
				0,
			clear: data?.entries.filter((e) => e.eligibility === "clear").length ?? 0,
			no_history:
				data?.entries.filter((e) => e.eligibility === "no_history").length ?? 0,
		}),
		[data],
	);

	const filtered = useMemo(() => {
		if (!data) {
			return [];
		}
		if (tab === "eligible") {
			return data.entries.filter(
				(e) => e.eligibility === "clear" || e.eligibility === "no_history",
			);
		}
		if (tab === "active") {
			return data.entries.filter(
				(e) => e.eligibility === "active" || e.eligibility === "limit_reached",
			);
		}
		if (tab === "cooling_down") {
			return data.entries.filter((e) => e.eligibility === "cooling_down");
		}
		return data.entries;
	}, [data, tab]);

	const handleUpdate = useCallback(
		(id: number, patch: RadarPatch) => {
			void api.patchRadarEntry(id, patch).then(() => {
				if ("hidden" in patch) {
					// Re-fetch so eligibility is recomputed and list membership is correct
					setLoading(true);
					void api
						.getRadar(showHidden)
						.then(setData)
						.finally(() => setLoading(false));
				} else {
					setData((prev) => {
						if (!prev) {
							return prev;
						}
						return {
							...prev,
							entries: prev.entries.map((e) =>
								e.id === id
									? { ...e, user_notes: patch.user_notes ?? e.user_notes }
									: e,
							),
						};
					});
				}
			});
		},
		[showHidden],
	);

	const handleToggle = useCallback(
		(id: number) => setExpandedId((prev) => (prev === id ? null : id)),
		[],
	);

	return (
		<Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 4 }}>
			{/* Header */}
			<Box
				sx={{
					alignItems: "flex-start",
					display: "flex",
					justifyContent: "space-between",
					mb: 1,
				}}
			>
				<Typography variant="h5" fontWeight={700}>
					FAANG Radar
				</Typography>
				<FormControlLabel
					control={
						<Switch
							size="small"
							checked={showHidden}
							onChange={(e) => setShowHidden(e.target.checked)}
						/>
					}
					label={
						<Typography variant="caption" color="text.secondary">
							Show hidden
						</Typography>
					}
					sx={{ mr: 0 }}
				/>
			</Box>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Track reapplication cooldowns across target companies
			</Typography>

			{error && (
				<Typography color="error" sx={{ mb: 2 }}>
					Failed to load radar data. Please try again.
				</Typography>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			) : null}

			{!loading && data && (
				<>
					{/* Summary chips */}
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
						<Chip
							label={`Active: ${counts.active}`}
							size="small"
							color="primary"
							variant="outlined"
						/>
						<Chip
							label={`App Limit: ${counts.limit_reached}`}
							size="small"
							sx={{ borderColor: "#6a1b9a", color: "#6a1b9a" }}
							variant="outlined"
						/>
						<Chip
							label={`Cooling Down: ${counts.cooling_down}`}
							size="small"
							sx={{ borderColor: "#e65100", color: "#e65100" }}
							variant="outlined"
						/>
						<Chip
							label={`Clear: ${counts.clear}`}
							size="small"
							sx={{ borderColor: "#2e7d32", color: "#2e7d32" }}
							variant="outlined"
						/>
						<Chip
							label={`No History: ${counts.no_history}`}
							size="small"
							variant="outlined"
						/>
					</Box>

					{/* Filter tabs */}
					<Tabs
						value={tab}
						onChange={(_, v: TabValue) => {
							setTab(v);
							setExpandedId(null);
						}}
						sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
					>
						<Tab label={`All (${data.entries.length})`} value="all" />
						<Tab
							label={`Eligible Now (${counts.clear + counts.no_history})`}
							value="eligible"
						/>
						<Tab
							label={`Active (${counts.active + counts.limit_reached})`}
							value="active"
						/>
						<Tab
							label={`On Cooldown (${counts.cooling_down})`}
							value="cooling_down"
						/>
					</Tabs>

					{/* Column header */}
					<Box
						sx={{
							color: "text.disabled",
							display: "flex",
							fontSize: "0.7rem",
							fontWeight: 600,
							gap: 1.5,
							mb: 0.5,
							px: 1.5,
							textTransform: "uppercase",
						}}
					>
						<Box sx={{ width: 20, flexShrink: 0 }} />
						<Box sx={{ width: 180, flexShrink: 0 }}>Company</Box>
						<Box sx={{ flex: 1 }}>Latest Active Status</Box>
						<Box sx={{ width: 72, textAlign: "right", flexShrink: 0 }}>
							Last Activity
						</Box>
						<Box sx={{ width: 148, textAlign: "right", flexShrink: 0 }}>
							Eligibility
						</Box>
						<Box sx={{ width: 18, flexShrink: 0 }} />
					</Box>

					{/* Rows */}
					{filtered.length === 0 ? (
						<Typography
							variant="body2"
							color="text.disabled"
							sx={{ textAlign: "center", mt: 8 }}
						>
							No companies match this filter.
						</Typography>
					) : (
						filtered.map((entry) => (
							<RadarRow
								key={entry.id}
								entry={entry}
								expanded={expandedId === entry.id}
								onToggle={() => handleToggle(entry.id)}
								onUpdate={(patch) => handleUpdate(entry.id, patch)}
							/>
						))
					)}

					{/* Hidden companies */}
					{showHidden &&
						(() => {
							const hiddenEntries = data.entries.filter((e) => e.hidden);
							if (hiddenEntries.length === 0) {
								return null;
							}
							return (
								<Box sx={{ mt: 4 }}>
									<Typography
										variant="caption"
										color="text.disabled"
										fontWeight={600}
										sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
									>
										Hidden ({hiddenEntries.length})
									</Typography>
									{hiddenEntries.map((entry) => (
										<RadarRow
											key={entry.id}
											entry={entry}
											expanded={expandedId === entry.id}
											onToggle={() => handleToggle(entry.id)}
											onUpdate={(patch) => handleUpdate(entry.id, patch)}
										/>
									))}
								</Box>
							);
						})()}
				</>
			)}
		</Box>
	);
}
