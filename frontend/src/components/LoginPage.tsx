import { Box, Button, Card, CardContent, Typography } from "@mui/material";

export default function LoginPage() {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				bgcolor: "background.default",
			}}
		>
			<Card sx={{ maxWidth: 400, width: "100%", mx: 2 }}>
				<CardContent
					sx={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
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
						sx={{ mt: 1, textTransform: "none", fontWeight: 500 }}
					>
						Continue with Google
					</Button>
				</CardContent>
			</Card>
		</Box>
	);
}
