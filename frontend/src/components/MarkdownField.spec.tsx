import React, { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownField from "./MarkdownField";

const DEFAULT_PROPS = {
	label: "Job Description",
	onChange: vi.fn(),
	placeholder: "Enter a description...",
};

/** Wraps MarkdownField with local state so onChange propagates back as a new value prop. */
function Controlled({ initialValue }: { initialValue: string | null }) {
	const [value, setValue] = useState<string | null>(initialValue);
	return (
		<MarkdownField
			{...DEFAULT_PROPS}
			value={value}
			onChange={(v) => {
				setValue(v);
				DEFAULT_PROPS.onChange(v);
			}}
		/>
	);
}

describe("MarkdownField", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			writable: true,
			configurable: true,
		});
	});

	describe("null value — edit mode", () => {
		it("renders a labeled textarea", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value={null} />);
			expect(screen.getByLabelText("Job Description")).toBeInTheDocument();
		});

		it("shows the placeholder text", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value={null} />);
			expect(
				screen.getByPlaceholderText("Enter a description..."),
			).toBeInTheDocument();
		});

		it("calls onChange with the typed value", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value={null} />);
			fireEvent.change(screen.getByLabelText("Job Description"), {
				target: { value: "Hello world" },
			});
			expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith("Hello world");
		});

		it("calls onChange with null when the field is cleared", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="existing" />);
			fireEvent.click(
				screen.getByRole("button", { name: "Edit job description" }),
			);
			fireEvent.change(screen.getByLabelText("Job Description"), {
				target: { value: "" },
			});
			expect(DEFAULT_PROPS.onChange).toHaveBeenCalledWith(null);
		});

		it("stays editable after the first character is typed (regression)", () => {
			// Bug: without onFocus setting editing=true, typing the first char would
			// flip value from null→"H", making !value false and editing still false,
			// which caused the field to switch to read-only mid-typing.
			render(<Controlled initialValue={null} />);
			const textarea = screen.getByLabelText("Job Description");
			fireEvent.focus(textarea);
			fireEvent.change(textarea, { target: { value: "H" } });
			// Textarea must still be present — not replaced by the markdown renderer
			expect(screen.getByLabelText("Job Description")).toBeInTheDocument();
		});
	});

	describe("non-null value — read-only mode", () => {
		it("renders the label as a caption", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Some content" />);
			expect(screen.getByText("Job Description")).toBeInTheDocument();
		});

		it("does not show a textarea", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Some content" />);
			expect(
				screen.queryByLabelText("Job Description"),
			).not.toBeInTheDocument();
		});

		it("renders plain text content", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Plain text" />);
			expect(screen.getByText("Plain text")).toBeInTheDocument();
		});

		it("renders bold markdown as strong text", () => {
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value="**bold text**" />,
			);
			const strong = container.querySelector("strong");
			expect(strong).toBeInTheDocument();
			expect(strong).toHaveTextContent("bold text");
		});

		it("renders italic markdown as emphasised text", () => {
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value="_italic text_" />,
			);
			const em = container.querySelector("em");
			expect(em).toBeInTheDocument();
			expect(em).toHaveTextContent("italic text");
		});

		it("renders an atx heading", () => {
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value="## Section" />,
			);
			expect(container.querySelector("h2")).toHaveTextContent("Section");
		});

		it("renders an unordered list", () => {
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value={"- Alpha\n- Beta"} />,
			);
			const items = container.querySelectorAll("li");
			expect(items).toHaveLength(2);
			expect(items[0]).toHaveTextContent("Alpha");
			expect(items[1]).toHaveTextContent("Beta");
		});

		it("shows the edit button", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="content" />);
			expect(
				screen.getByRole("button", { name: "Edit job description" }),
			).toBeInTheDocument();
		});

		it("shows the copy button", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="content" />);
			expect(
				screen.getByRole("button", { name: "Copy job description" }),
			).toBeInTheDocument();
		});
	});

	describe("edit / read-only toggle", () => {
		it("switches to edit mode when the edit button is clicked", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Some content" />);
			fireEvent.click(
				screen.getByRole("button", { name: "Edit job description" }),
			);
			expect(screen.getByLabelText("Job Description")).toBeInTheDocument();
		});

		it("pre-fills the textarea with the existing value", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Existing text" />);
			fireEvent.click(
				screen.getByRole("button", { name: "Edit job description" }),
			);
			expect(screen.getByLabelText("Job Description")).toHaveValue(
				"Existing text",
			);
		});

		it("returns to read-only when the textarea is blurred", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="Some content" />);
			fireEvent.click(
				screen.getByRole("button", { name: "Edit job description" }),
			);
			fireEvent.blur(screen.getByLabelText("Job Description"));
			expect(
				screen.queryByLabelText("Job Description"),
			).not.toBeInTheDocument();
			expect(screen.getByText("Some content")).toBeInTheDocument();
		});
	});

	describe("copy button", () => {
		it("copies the raw markdown value to the clipboard", () => {
			render(<MarkdownField {...DEFAULT_PROPS} value="**Copy me**" />);
			fireEvent.click(
				screen.getByRole("button", { name: "Copy job description" }),
			);
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith("**Copy me**");
		});

		it("shows a checkmark icon immediately after copying", () => {
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value="content" />,
			);
			fireEvent.click(
				screen.getByRole("button", { name: "Copy job description" }),
			);
			// CheckIcon is rendered; ContentCopyIcon is not
			expect(
				container.querySelector('[data-testid="CheckIcon"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-testid="ContentCopyIcon"]'),
			).not.toBeInTheDocument();
		});

		it("reverts to the copy icon after 2 seconds", () => {
			vi.useFakeTimers();
			const { container } = render(
				<MarkdownField {...DEFAULT_PROPS} value="content" />,
			);
			fireEvent.click(
				screen.getByRole("button", { name: "Copy job description" }),
			);
			expect(
				container.querySelector('[data-testid="CheckIcon"]'),
			).toBeInTheDocument();

			act(() => vi.advanceTimersByTime(2000));

			expect(
				container.querySelector('[data-testid="ContentCopyIcon"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-testid="CheckIcon"]'),
			).not.toBeInTheDocument();
			vi.useRealTimers();
		});
	});

	describe("paste handling", () => {
		it("converts an HTML paste to its markdown equivalent", () => {
			const onChange = vi.fn();
			render(
				<MarkdownField {...DEFAULT_PROPS} value={null} onChange={onChange} />,
			);
			fireEvent.paste(screen.getByLabelText("Job Description"), {
				clipboardData: {
					getData: (type: string) =>
						type === "text/html"
							? "<p><strong>Requirements</strong></p><ul><li>TypeScript</li></ul>"
							: "",
				},
			});
			expect(onChange).toHaveBeenCalledOnce();
			const result: string = onChange.mock.calls[0]![0];
			expect(result).toContain("**Requirements**");
			expect(result).toContain("TypeScript");
		});

		it("does not call onChange for a plain-text paste (lets browser handle it)", () => {
			const onChange = vi.fn();
			render(
				<MarkdownField {...DEFAULT_PROPS} value={null} onChange={onChange} />,
			);
			fireEvent.paste(screen.getByLabelText("Job Description"), {
				clipboardData: {
					getData: (_type: string) => "",
				},
			});
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe("label prop", () => {
		it("uses the label prop for the textarea label and button aria-labels", () => {
			render(
				<MarkdownField label="Notes" value="note text" onChange={vi.fn()} />,
			);
			expect(screen.getByText("Notes")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Edit notes" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Copy notes" }),
			).toBeInTheDocument();
		});
	});
});
