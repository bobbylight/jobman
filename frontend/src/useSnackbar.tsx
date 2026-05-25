import React, { useCallback, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

type Severity = "error" | "info" | "success" | "warning";

interface SnackState {
	message: string;
	open: boolean;
	severity: Severity;
}

const INITIAL: SnackState = { message: "", open: false, severity: "success" };

export function useSnackbar(): [
	notify: (message: string, severity?: Severity) => void,
	snackbarNode: React.ReactNode,
] {
	const [snack, setSnack] = useState<SnackState>(INITIAL);

	const notify = useCallback(
		(message: string, severity: Severity = "success") => {
			setSnack({ message, open: true, severity });
		},
		[],
	);

	const snackbarNode = (
		<Snackbar
			open={snack.open}
			autoHideDuration={3000}
			onClose={() => setSnack((s) => ({ ...s, open: false }))}
			anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
		>
			<Alert severity={snack.severity} variant="filled" sx={{ width: "100%" }}>
				{snack.message.includes("\n")
					? snack.message
							.split("\n")
							// eslint-disable-next-line react/no-array-index-key
							.map((line, i) => <div key={i}>{line}</div>)
					: snack.message}
			</Alert>
		</Snackbar>
	);

	return [notify, snackbarNode];
}
