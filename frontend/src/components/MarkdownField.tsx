import React, { useState } from "react";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TurndownService from "turndown";

const turndown = new TurndownService({
	bulletListMarker: "-",
	codeBlockStyle: "fenced",
	headingStyle: "atx",
});
// Strip images and tables — not needed for job postings
turndown.remove(["img", "table"]);

interface Props {
	label: string;
	value: string | null;
	onChange: (value: string | null) => void;
	placeholder?: string;
}

export default function MarkdownField({
	label,
	value,
	onChange,
	placeholder,
}: Props) {
	const [editing, setEditing] = useState(false);
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		void navigator.clipboard.writeText(value ?? "");
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
		const html = e.clipboardData.getData("text/html");
		if (!html) {
			return;
		}
		e.preventDefault();
		const md = turndown.turndown(html);
		const target = e.currentTarget.querySelector("textarea");
		if (!target) {
			return;
		}
		const start = target.selectionStart ?? 0;
		const end = target.selectionEnd ?? 0;
		const current = value ?? "";
		const next = current.slice(0, start) + md + current.slice(end);
		onChange(next || null);
		// Restore cursor position after state update
		requestAnimationFrame(() => {
			target.selectionStart = start + md.length;
			target.selectionEnd = start + md.length;
		});
	}

	if (editing || !value) {
		return (
			<TextField
				label={label}
				value={value ?? ""}
				onChange={(e) => onChange(e.target.value || null)}
				onPaste={handlePaste}
				onFocus={() => setEditing(true)}
				onBlur={() => setEditing(false)}
				fullWidth
				size="small"
				multiline
				minRows={6}
				placeholder={placeholder}
				// eslint-disable-next-line jsx-a11y/no-autofocus -- user-initiated focus, not a surprise steal
				autoFocus
				slotProps={{
					htmlInput: { style: { resize: "vertical" } },
				}}
			/>
		);
	}

	return (
		<Box>
			<Box sx={{ alignItems: "center", display: "flex", gap: 0.5, mb: 0.5 }}>
				<Typography variant="caption" color="text.secondary">
					{label}
				</Typography>
				<IconButton
					size="small"
					onClick={() => setEditing(true)}
					aria-label={`Edit ${label.toLowerCase()}`}
					title={`Edit ${label.toLowerCase()}`}
					sx={{ p: 0.25 }}
				>
					<EditIcon sx={{ fontSize: 14 }} />
				</IconButton>
			</Box>
			<Box
				sx={{
					"& a": { color: "primary.main" },
					"& blockquote": {
						borderColor: "divider",
						borderLeft: "3px solid",
						color: "text.secondary",
						ml: 0,
						pl: 1.5,
					},
					"& code": {
						bgcolor: "action.hover",
						borderRadius: 0.5,
						fontFamily: "monospace",
						fontSize: "0.85em",
						px: 0.5,
					},
					"& em": { fontStyle: "italic" },
					"& h1": { fontSize: "1.25em" },
					"& h1, & h2, & h3, & h4, & h5, & h6": {
						fontWeight: 600,
						lineHeight: 1.3,
						mb: 0.5,
						mt: 1,
					},
					"& h2": { fontSize: "1.1em" },
					"& h3, & h4, & h5, & h6": { fontSize: "1em" },
					"& li": { mb: 0.25 },
					"& p": { mb: 1, mt: 0 },
					"& pre": {
						bgcolor: "action.hover",
						borderRadius: 1,
						mb: 1,
						overflowX: "auto",
						p: 1,
					},
					"& strong": { fontWeight: 700 },
					"& ul, & ol": { mb: 1, mt: 0, pl: 2.5 },
					border: "1px solid",
					borderColor: "divider",
					borderRadius: 1,
					fontSize: "0.875rem",
					lineHeight: 1.6,
					maxHeight: "12rem",
					minHeight: "9rem",
					overflowY: "auto",
					position: "relative",
					px: 1.5,
					py: 1,
				}}
			>
				<Tooltip title={copied ? "Copied!" : "Copy"} placement="left">
					<IconButton
						size="small"
						onClick={handleCopy}
						aria-label={`Copy ${label.toLowerCase()}`}
						sx={{
							"&:hover": { bgcolor: "action.hover" },
							bgcolor: "background.paper",
							border: "1px solid",
							borderColor: "divider",
							float: "right",
							ml: 1,
							p: 0.5,
							position: "sticky",
							top: 4,
						}}
					>
						{copied ? (
							<CheckIcon sx={{ color: "success.main", fontSize: 14 }} />
						) : (
							<ContentCopyIcon sx={{ fontSize: 14 }} />
						)}
					</IconButton>
				</Tooltip>
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
			</Box>
		</Box>
	);
}
