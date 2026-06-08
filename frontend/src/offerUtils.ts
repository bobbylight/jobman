import type { Offer } from "./types";

function n(value: number | null): number {
	return value ?? 0;
}

function vestingYears(offer: Offer): number {
	return offer.equity_vesting_years || 4;
}

export function equityPerYear(offer: Offer): number {
	return n(offer.equity_amount) / vestingYears(offer);
}

export function annualBonus(offer: Offer): number {
	return n(offer.base_pay_amount) * (n(offer.target_bonus_percent) / 100);
}

export function computeYear1TC(offer: Offer): number {
	return (
		n(offer.base_pay_amount) +
		annualBonus(offer) +
		equityPerYear(offer) +
		n(offer.signing_bonus_amount) +
		n(offer.wellness_stipend_amount) +
		n(offer.other_amount)
	);
}

export function computeOngoingTC(offer: Offer): number {
	return (
		n(offer.base_pay_amount) +
		annualBonus(offer) +
		equityPerYear(offer) +
		n(offer.wellness_stipend_amount) +
		(offer.other_is_recurring ? n(offer.other_amount) : 0)
	);
}

export function formatCurrency(amount: number): string {
	return amount.toLocaleString("en-US", {
		currency: "USD",
		maximumFractionDigits: 0,
		style: "currency",
	});
}

export function formatCompactCurrency(amount: number): string {
	return amount.toLocaleString("en-US", {
		currency: "USD",
		maximumFractionDigits: 1,
		notation: "compact",
		style: "currency",
	});
}
