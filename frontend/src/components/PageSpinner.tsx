import React from "react";
import { Box, CircularProgress } from "@mui/material";

export default function PageSpinner() {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
			<CircularProgress />
		</Box>
	);
}
