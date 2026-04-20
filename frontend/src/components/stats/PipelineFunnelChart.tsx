import React, { useMemo } from "react";
import { Sankey, Tooltip } from "recharts";
import type { SankeyNode } from "recharts/types/util/types";
import { Box, Typography, useTheme } from "@mui/material";
import { ENDING_SUBSTATUSES, STATUSES, STATUS_COLORS } from "../../constants";
import type { EndingSubstatus, JobStatus } from "../../types";

interface Props {
	transitions: { from: string; to: string; count: number }[];
}

interface ChartNode {
	name: string;
	color: string;
}

interface SankeyNodeProps {
	x: number;
	y: number;
	width: number;
	height: number;
	payload: SankeyNode & ChartNode & { value: number };
}

interface SankeyLinkProps {
	sourceX: number;
	targetX: number;
	sourceY: number;
	targetY: number;
	sourceControlX: number;
	targetControlX: number;
	linkWidth: number;
	payload: {
		source: SankeyNode & ChartNode;
		target: SankeyNode & ChartNode;
	};
}

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

// Full node ordering: granular starting statuses first (same Sankey column),
// Then main pipeline statuses (excluding "Not started"), then terminal
// Substatuses. All links must be forward (source index < target index).
const NODE_ORDER: string[] = [
	...Object.keys(STARTING_STATUS_COLORS),
	...STATUSES.filter((s) => s !== "Not started"),
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

/** Build the { nodes, links } structure that recharts Sankey expects. */
function toSankeyData(transitions: Props["transitions"]) {
	// Collect every status that appears in the transition data
	const statusSet = new Set<string>();
	for (const t of transitions) {
		statusSet.add(t.from);
		statusSet.add(t.to);
	}

	// Order nodes by the canonical pipeline order so the Sankey flows left→right
	const ordered = NODE_ORDER.filter((s) => statusSet.has(s));
	const indexMap = new Map<string, number>(ordered.map((s, i) => [s, i]));

	const nodes: ChartNode[] = ordered.map((s) => ({
		color: nodeColor(s),
		name: s,
	}));

	const links = transitions
		.filter((t) => {
			const src = indexMap.get(t.from);
			const tgt = indexMap.get(t.to);
			// Only include forward links (source index < target index) to avoid
			// Cycles or self-loops which crash the Sankey layout.
			return src !== undefined && tgt !== undefined && src < tgt;
		})
		.map((t) => ({
			source: indexMap.get(t.from) as number,
			target: indexMap.get(t.to) as number,
			value: t.count,
		}));

	return { links, nodes };
}

function CustomNode(props: SankeyNodeProps) {
	const { x, y, width, height, payload } = props;
	const color = payload.color ?? "#90a4ae";
	const labelX = x + width / 2;
	const labelY = y + height / 2;
	const padX = 0;
	const padY = 3;
	const countStr = String(payload.value);
	const estimatedTextWidth =
		countStr.length * 7.5 + 4 + payload.name.length * 6.5;
	const bgWidth = estimatedTextWidth + padX * 2;
	const bgHeight = 11 + padY * 2;

	return (
		<g>
			<rect x={x} y={y} width={width} height={height} fill={color} rx={3} />
			<rect
				x={labelX - bgWidth / 2}
				y={labelY - bgHeight / 2}
				width={bgWidth}
				height={bgHeight}
				rx={4}
				fill="rgba(255,255,255,0.82)"
			/>
			<text
				x={labelX}
				y={labelY}
				dy="0.35em"
				textAnchor="middle"
				fontSize={11}
				fill="#444"
			>
				<tspan fontWeight="bold">{countStr}</tspan>
				{` ${payload.name}`}
			</text>
		</g>
	);
}

function CustomLink(props: SankeyLinkProps) {
	const {
		sourceX,
		targetX,
		sourceY,
		targetY,
		sourceControlX,
		targetControlX,
		linkWidth,
		payload,
	} = props;
	const color = payload.target.color ?? "#90a4ae";

	return (
		<path
			d={`
        M${sourceX},${sourceY}
        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
      `}
			fill="none"
			stroke={color}
			strokeWidth={linkWidth}
			strokeOpacity={0.3}
		/>
	);
}

export default function PipelineFunnelChart({ transitions }: Props) {
	const theme = useTheme();
	const data = useMemo(() => toSankeyData(transitions), [transitions]);

	if (data.links.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 320,
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
		<Sankey
			width={480}
			height={320}
			data={data}
			node={CustomNode as any}
			link={CustomLink as any}
			nodeWidth={12}
			nodePadding={14}
			sort={false}
			iterations={1}
			verticalAlign="justify"
			margin={{ bottom: 4, left: 50, right: 55, top: 4 }}
		>
			<Tooltip
				formatter={(value) => [`${value} jobs`]}
				contentStyle={{
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: 8,
					fontSize: 12,
				}}
			/>
		</Sankey>
	);
}
