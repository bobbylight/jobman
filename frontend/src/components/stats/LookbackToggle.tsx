import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { StatsWindow } from "../../types";

interface Props {
	value: StatsWindow;
	onChange: (value: StatsWindow) => void;
}

export default function LookbackToggle({ value, onChange }: Props) {
	return (
		<ToggleButtonGroup
			value={value}
			exclusive
			onChange={(_e, v: StatsWindow | null) => {
				if (v !== null) onChange(v);
			}}
			size="small"
		>
			<ToggleButton value="30">Last 30 days</ToggleButton>
			<ToggleButton value="90">Last 90 days</ToggleButton>
			<ToggleButton value="all">All time</ToggleButton>
		</ToggleButtonGroup>
	);
}
