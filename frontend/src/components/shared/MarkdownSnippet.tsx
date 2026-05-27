import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const INLINE_COMPONENTS = {
	p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

/** Renders the first non-empty line of markdown text as inline content (no block wrappers). */
export default function MarkdownSnippet({ text }: { text: string }) {
	const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
	return (
		<ReactMarkdown remarkPlugins={[remarkGfm]} components={INLINE_COMPONENTS}>
			{firstLine}
		</ReactMarkdown>
	);
}
