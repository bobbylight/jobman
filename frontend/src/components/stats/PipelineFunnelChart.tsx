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
	payload: SankeyNode & ChartNode;
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
	"No response": "#bdbdbd",
	"Offer accepted": "#2e7d32",
	"Offer declined": "#f57c00",
	Rejected: "#e53935",
	Withdrawn: "#78909c",
};

// Full node ordering: main pipeline statuses first, then granular terminal
// Outcomes. Substatuses must come after all main statuses so every link in
// The Sankey is a forward link (source index < target index).
const NODE_ORDER: string[] = [...STATUSES, ...ENDING_SUBSTATUSES];

function nodeColor(name: string): string {
	return (
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

	return (
		<g>
			<rect x={x} y={y} width={width} height={height} fill={color} rx={3} />
			<text
				x={x + width + 6}
				y={y + height / 2}
				dy="0.35em"
				textAnchor="start"
				fontSize={11}
				fill="#555"
			>
				{payload.name}
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
	const color = payload.source.color ?? "#90a4ae";

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
					height: 260,
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
			height={260}
			data={data}
			node={CustomNode as any}
			link={CustomLink as any}
			nodeWidth={12}
			nodePadding={14}
			sort={false}
			verticalAlign="justify"
			margin={{ bottom: 4, left: 4, right: 140, top: 4 }}
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
