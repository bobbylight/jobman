import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	sankey as d3Sankey,
	sankeyJustify,
	sankeyLinkHorizontal,
	type SankeyLink,
	type SankeyNode,
} from "d3-sankey";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { ENDING_SUBSTATUSES, STATUSES, STATUS_COLORS } from "../../constants";
import type { EndingSubstatus, JobStatus } from "../../types";

interface Props {
	transitions: { from: string; to: string; count: number }[];
	onLinkClick?: (from: string, to: string) => void;
}

interface NodeDatum {
	name: string;
	color: string;
}

// D3-sankey mutates nodes/links in place, so these carry the layout fields after compute
type LayoutNode = SankeyNode<NodeDatum, object>;
type LayoutLink = SankeyLink<NodeDatum, object>;

const SUBSTATUS_COLORS: Record<EndingSubstatus, string> = {
	Ghosted: "#8d6e63",
	"Job closed": "#7b1fa2",
	"No response": "#bdbdbd",
	"Not a good fit": "#e65100",
	"Offer accepted": "#2e7d32",
	"Offer declined": "#f57c00",
	Rejected: "#e53935",
	Withdrawn: "#78909c",
};

const STARTING_STATUS_COLORS: Record<string, string> = {
	Direct: "#90a4ae",
	Recruited: "#26c6da",
	Referred: "#43a047",
};

// Full node ordering: source nodes first, then active pipeline stages, then
// Terminal nodes. "Rejected/Withdrawn" is a fallback for jobs without a
// Specific ending substatus. All links must be forward (source index < target
// Index) to keep the Sankey flowing left→right.
const NODE_ORDER: string[] = [
	...Object.keys(STARTING_STATUS_COLORS),
	...STATUSES.filter((s) => s !== "Not started" && s !== "Rejected/Withdrawn"),
	"Rejected/Withdrawn",
	...ENDING_SUBSTATUSES,
];

function nodeColor(name: string): string {
	return (
		STARTING_STATUS_COLORS[name] ??
		STATUS_COLORS[name as JobStatus] ??
		SUBSTATUS_COLORS[name as EndingSubstatus] ??
		"#90a4ae"
	);
}

// Logical terminal nodes — stages that never have outgoing progression links.
// Pipeline stages like "Phone screen" are intentionally excluded so they always
// Exit from the bottom of a source node, keeping the active funnel at the bottom.
const TERMINAL_NAMES = new Set<string>([
	"Rejected/Withdrawn",
	...ENDING_SUBSTATUSES,
]);

function toSankeyData(transitions: Props["transitions"]) {
	const statusSet = new Set<string>();
	for (const t of transitions) {
		statusSet.add(t.from);
		statusSet.add(t.to);
	}

	const ordered = NODE_ORDER.filter((s) => statusSet.has(s));
	const indexMap = new Map<string, number>(ordered.map((s, i) => [s, i]));

	const nodes: NodeDatum[] = ordered.map((s) => ({
		color: nodeColor(s),
		name: s,
	}));

	const links = transitions
		.filter((t) => {
			const src = indexMap.get(t.from);
			const tgt = indexMap.get(t.to);
			// Only include forward links to avoid cycles / self-loops.
			return src !== undefined && tgt !== undefined && src < tgt;
		})
		.map((t) => ({
			source: indexMap.get(t.from) as number,
			target: indexMap.get(t.to) as number,
			value: t.count,
		}))
		// Within each source node, order links so they stack without crossing:
		//   1. Terminal links in ASCENDING target-index order — matches the node
		//      Order in the terminal column (NODE_ORDER top→bottom), so each link
		//      Arrives at the same vertical rank it exits, eliminating crossings.
		//   2. Progression links (next active stage) come last → bottom of node.
		// D3-sankey with linkSort(null) preserves this order exactly.
		.toSorted((a, b) => {
			// Sort by source first so same-source links are contiguous — this ensures
			// The secondary (terminal/progression) sort actually fires for all pairs.
			if (a.source !== b.source) {
				return a.source - b.source;
			}
			const aTerminal = TERMINAL_NAMES.has(ordered[a.target] ?? "");
			const bTerminal = TERMINAL_NAMES.has(ordered[b.target] ?? "");
			if (aTerminal !== bTerminal) {
				return aTerminal ? -1 : 1;
			}
			if (aTerminal) {
				return a.target - b.target;
			}
			return 0;
		});

	return { links, nodes };
}

const NODE_WIDTH = 12;
const NODE_PADDING = 60;
const MARGIN = { bottom: 4, left: 50, right: 130, top: 4 };

const pathGen = sankeyLinkHorizontal();

function nodeName(n: number | string | NodeDatum): string {
	return typeof n === "object" ? n.name : "";
}
function nodeColor2(n: number | string | NodeDatum): string {
	return typeof n === "object" ? n.color : "#90a4ae";
}

export default function PipelineFunnelChart({
	transitions,
	onLinkClick,
}: Props) {
	const theme = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const [chartWidth, setChartWidth] = useState(700);
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		text: string;
	} | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const ro = new ResizeObserver((entries) => {
			const [entry] = entries;
			if (entry) {
				setChartWidth(Math.floor(entry.contentRect.width));
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const raw = useMemo(() => toSankeyData(transitions), [transitions]);

	const terminalCount = raw.nodes.filter((n) =>
		ENDING_SUBSTATUSES.includes(n.name as EndingSubstatus),
	).length;
	const chartHeight = Math.max(360, terminalCount * 60 + 40);

	const { nodes, links } = useMemo(() => {
		if (raw.links.length === 0) {
			return { links: [], nodes: [] };
		}

		const gen = d3Sankey<NodeDatum, object>()
			.nodeId((d) => (d as LayoutNode).index ?? 0)
			.nodeAlign(sankeyJustify)
			.nodeWidth(NODE_WIDTH)
			.nodePadding(NODE_PADDING)
			.nodeSort(null) // Preserve NODE_ORDER within each column
			.linkSort(null) // Preserve link data order: progression last = bottom
			.extent([
				[MARGIN.left, MARGIN.top],
				[chartWidth - MARGIN.right, chartHeight - MARGIN.bottom],
			]);

		// D3-sankey mutates input, so pass fresh copies
		return gen({
			nodes: raw.nodes.map((n) => ({ ...n })),
			links: raw.links.map((l) => ({ ...l })),
		});
	}, [raw, chartWidth, chartHeight]);

	const handleLinkEnter = useCallback(
		(e: React.MouseEvent, idx: number, text: string) => {
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) {
				return;
			}
			setHoveredIdx(idx);
			setTooltip({
				text,
				x: e.clientX - rect.left + 10,
				y: e.clientY - rect.top - 20,
			});
		},
		[],
	);

	const handleLinkMove = useCallback((e: React.MouseEvent, text: string) => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}
		setTooltip({
			text,
			x: e.clientX - rect.left + 10,
			y: e.clientY - rect.top - 20,
		});
	}, []);

	const handleLinkLeave = useCallback(() => {
		setHoveredIdx(null);
		setTooltip(null);
	}, []);

	if (raw.links.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: chartHeight,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No data for this period
				</Typography>
			</Box>
		);
	}

	return (
		<Box ref={containerRef} sx={{ position: "relative", width: "100%" }}>
			<svg
				data-testid="sankey-chart"
				width={chartWidth}
				height={chartHeight}
				style={{ overflow: "visible" }}
			>
				{/* Links */}
				<g>
					{(links as LayoutLink[]).map((link, i) => {
						const color = nodeColor2(link.target);
						const tipText = `${link.value} jobs`;
						const key = `${nodeName(link.source)}->${nodeName(link.target)}`;
						return (
							<path
								key={key}
								d={pathGen(link as any) ?? ""}
								fill="none"
								stroke={color}
								strokeWidth={link.width ?? 1}
								strokeOpacity={hoveredIdx === i ? 0.55 : 0.3}
								onClick={
									onLinkClick
										? () =>
												onLinkClick(
													nodeName(link.source),
													nodeName(link.target),
												)
										: undefined
								}
								onMouseEnter={(e) => handleLinkEnter(e, i, tipText)}
								onMouseMove={(e) => handleLinkMove(e, tipText)}
								onMouseLeave={handleLinkLeave}
								style={onLinkClick ? { cursor: "pointer" } : undefined}
							/>
						);
					})}
				</g>

				{/* Nodes */}
				<g>
					{(nodes as LayoutNode[]).map((node) => {
						const x = node.x0 ?? 0;
						const y = node.y0 ?? 0;
						const w = (node.x1 ?? 0) - x;
						const h = (node.y1 ?? 0) - y;
						const lx = x + w + 6;
						const cy = y + h / 2;
						const count = String(node.value ?? 0);
						const bgW = count.length * 7.5 + 4 + node.name.length * 6.5;
						const bgH = 17;
						return (
							<g key={node.name}>
								<rect
									x={x}
									y={y}
									width={w}
									height={h}
									fill={node.color}
									rx={3}
								/>
								<rect
									x={lx - 2}
									y={cy - bgH / 2}
									width={bgW}
									height={bgH}
									rx={4}
									fill="rgba(255,255,255,0.82)"
								/>
								<text
									x={lx}
									y={cy}
									dy="0.35em"
									textAnchor="start"
									fontSize={11}
									fill="#444"
								>
									<tspan fontWeight="bold">{count}</tspan>
									{` ${node.name}`}
								</text>
							</g>
						);
					})}
				</g>
			</svg>

			{tooltip !== null && (
				<Paper
					elevation={2}
					sx={{
						border: `1px solid ${theme.palette.divider}`,
						borderRadius: 2,
						fontSize: 12,
						left: tooltip.x,
						p: "4px 8px",
						pointerEvents: "none",
						position: "absolute",
						top: tooltip.y,
						zIndex: 10,
					}}
				>
					{tooltip.text}
				</Paper>
			)}
		</Box>
	);
}
