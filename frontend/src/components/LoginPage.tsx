import { Box, Button, Card, CardContent, Typography } from "@mui/material";

export default function LoginPage() {
	return (
		<Box
			sx={{
				alignItems: "center",
				bgcolor: "background.default",
				display: "flex",
				justifyContent: "center",
				minHeight: "100vh",
			}}
		>
			<Card sx={{ maxWidth: 400, mx: 2, width: "100%" }}>
				<CardContent
					sx={{
						alignItems: "center",
						display: "flex",
						flexDirection: "column",
						gap: 2,
						p: 4,
					}}
				>
					<Box
						component="img"
						src="/img/logo.svg"
						alt="JobMan"
						sx={{ height: 72, mb: 1 }}
					/>
					<Typography variant="h5" fontWeight={600}>
						JobMan
					</Typography>
					<Typography variant="body2" color="text.secondary" textAlign="center">
						Track your job applications across every stage of your search.
					</Typography>
					<Button
						variant="outlined"
						fullWidth
						size="large"
						href="/api/auth/google"
						sx={{ fontWeight: 500, mt: 1, textTransform: "none" }}
					>
						Continue with Google
					</Button>
				</CardContent>
			</Card>
		</Box>
	);
}
