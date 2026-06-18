import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

type Severity = "error" | "info" | "success" | "warning";

export type NotifyFn = (message: string, severity?: Severity) => void;

interface SnackState {
	message: string;
	open: boolean;
	severity: Severity;
}

const INITIAL: SnackState = { message: "", open: false, severity: "success" };

const SnackbarContext = createContext<NotifyFn | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
	const [snack, setSnack] = useState<SnackState>(INITIAL);

	const notify = useCallback<NotifyFn>((message, severity = "success") => {
		setSnack({ message, open: true, severity });
	}, []);

	return (
		<SnackbarContext.Provider value={notify}>
			{children}
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
					{snack.message.includes("\n")
						? snack.message
								.split("\n")
								// eslint-disable-next-line react/no-array-index-key
								.map((line, i) => <div key={i}>{line}</div>)
						: snack.message}
				</Alert>
			</Snackbar>
		</SnackbarContext.Provider>
	);
}

export function useNotify(): NotifyFn {
	const notify = useContext(SnackbarContext);
	if (!notify) {
		throw new Error("useNotify must be used within SnackbarProvider");
	}
	return notify;
}
