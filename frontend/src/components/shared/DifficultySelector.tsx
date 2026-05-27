import React, { useState } from "react";
import { Box, Typography } from "@mui/material";

interface DifficultySelectorProps {
	value: number;
	onChange?: (value: number) => void;
	readOnly?: boolean;
}

function getDifficultyColor(value: number): string {
	if (value <= 2) {
		return "success.main";
	}
	if (value === 3) {
		return "warning.main";
	}
	return "error.main";
}

export default function DifficultySelector({
	value,
	onChange,
	readOnly = false,
}: DifficultySelectorProps) {
	const [hovered, setHovered] = useState<number | null>(null);

	const displayValue = hovered ?? value;
	const color = getDifficultyColor(displayValue);

	return (
		<Box sx={{ alignItems: "center", display: "flex", gap: 1 }}>
			<Typography variant="caption" color="text.secondary">
				Difficulty
			</Typography>
			<Box sx={{ display: "flex", gap: 0.5 }}>
				{[1, 2, 3, 4, 5].map((n) => {
					const filled = n <= displayValue;
					return (
						<Box
							key={n}
							onClick={readOnly ? undefined : () => onChange?.(n)}
							onMouseEnter={readOnly ? undefined : () => setHovered(n)}
							onMouseLeave={readOnly ? undefined : () => setHovered(null)}
							sx={{
								bgcolor: filled ? color : "transparent",
								border: "1.5px solid",
								borderColor: filled ? color : "text.disabled",
								borderRadius: "50%",
								cursor: readOnly ? "default" : "pointer",
								height: 12,
								transition: "background-color 0.1s, border-color 0.1s",
								width: 12,
							}}
						/>
					);
				})}
			</Box>
		</Box>
	);
}
