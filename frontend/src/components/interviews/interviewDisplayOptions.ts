import type { InterviewFeeling, InterviewVibe } from "../../types";

interface DisplayOption<T> {
	value: T;
	emoji: string;
	label: string;
	selectedBg: string;
	selectedColor: string;
	chipBg: string;
	chipColor: string;
}

export const VIBE_OPTIONS: DisplayOption<InterviewVibe>[] = [
	{
		value: "casual",
		emoji: "☕",
		label: "Casual",
		selectedBg: "#e3f2fd",
		selectedColor: "#1565c0",
		chipBg: "#e3f2fd",
		chipColor: "#1565c0",
	},
	{
		value: "intense",
		emoji: "⚡",
		label: "Intense",
		selectedBg: "#fff3e0",
		selectedColor: "#e65100",
		chipBg: "#fff3e0",
		chipColor: "#e65100",
	},
];

export const FEELING_OPTIONS: DisplayOption<InterviewFeeling>[] = [
	{
		value: "aced",
		emoji: "🌟",
		label: "Aced",
		selectedBg: "#e8f5e9",
		selectedColor: "#1b5e20",
		chipBg: "#e8f5e9",
		chipColor: "#1b5e20",
	},
	{
		value: "pretty_good",
		emoji: "👍",
		label: "Pretty good",
		selectedBg: "#f1f8e9",
		selectedColor: "#33691e",
		chipBg: "#f1f8e9",
		chipColor: "#33691e",
	},
	{
		value: "meh",
		emoji: "😐",
		label: "Meh",
		selectedBg: "#fff8e1",
		selectedColor: "#f57f17",
		chipBg: "#fff8e1",
		chipColor: "#f57f17",
	},
	{
		value: "struggled",
		emoji: "😬",
		label: "Struggled",
		selectedBg: "#fff3e0",
		selectedColor: "#e65100",
		chipBg: "#fff3e0",
		chipColor: "#e65100",
	},
	{
		value: "flunked",
		emoji: "💀",
		label: "Flunked",
		selectedBg: "#ffebee",
		selectedColor: "#b71c1c",
		chipBg: "#ffebee",
		chipColor: "#b71c1c",
	},
];
