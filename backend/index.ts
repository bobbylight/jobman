import { config } from "dotenv";

config({ path: `.env.${process.env["NODE_ENV"] ?? "development"}` });

const { default: rawDb } = await import("./db.js");
const { createApp } = await import("./server.js");

const PORT = 3001;
const app = createApp(rawDb);
app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`JobMan API running at http://localhost:${PORT}`);
});
