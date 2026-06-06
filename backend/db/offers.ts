import type Database from "better-sqlite3";

export interface OfferRow {
	id: number;
	job_id: number;
	base_pay_amount: number | null;
	target_bonus_percent: number | null;
	equity_amount: number | null;
	equity_vesting_years: number;
	equity_type: string | null;
	signing_bonus_amount: number | null;
	wellness_stipend_amount: number | null;
	other_amount: number | null;
	other_label: string | null;
	other_is_recurring: boolean;
	k401_match_percent: number | null;
	offer_deadline: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

interface OfferDbRow extends Omit<OfferRow, "equity_vesting_years" | "other_is_recurring"> {
	equity_vesting_years: number | null;
	other_is_recurring: number;
}

export interface OfferCreateData {
	job_id: number;
	base_pay_amount: number | null;
	target_bonus_percent: number | null;
	equity_amount: number | null;
	equity_vesting_years: number | null;
	equity_type: string | null;
	signing_bonus_amount: number | null;
	wellness_stipend_amount: number | null;
	other_amount: number | null;
	other_label: string | null;
	other_is_recurring: boolean;
	k401_match_percent: number | null;
	offer_deadline: string | null;
	notes: string | null;
}

export type OfferUpdateData = Omit<OfferCreateData, "job_id">;

export interface OfferWithJobRow {
	job_id: number;
	company: string;
	role: string;
	link: string;
	fit_score: string | null;
	salary: string | null;
	favorite: number;
	tags_csv: string | null;
	has_offer: number;
	offer_id: number | null;
	base_pay_amount: number | null;
	target_bonus_percent: number | null;
	equity_amount: number | null;
	equity_vesting_years: number | null;
	equity_type: string | null;
	signing_bonus_amount: number | null;
	wellness_stipend_amount: number | null;
	other_amount: number | null;
	other_label: string | null;
	other_is_recurring: number | null;
	k401_match_percent: number | null;
	offer_deadline: string | null;
	offer_notes: string | null;
	offer_created_at: string | null;
	offer_updated_at: string | null;
}

function toClient(row: OfferDbRow): OfferRow {
	return {
		...row,
		equity_vesting_years: row.equity_vesting_years ?? 4,
		other_is_recurring: Boolean(row.other_is_recurring),
	};
}

export function getOffer(
	db: Database.Database,
	jobId: number,
): OfferRow | undefined {
	const row = db
		.prepare("SELECT * FROM offers WHERE job_id = ?")
		.get(jobId) as OfferDbRow | undefined;
	return row ? toClient(row) : undefined;
}

export function createOffer(
	db: Database.Database,
	data: OfferCreateData,
): OfferRow {
	const result = db
		.prepare(
			`INSERT INTO offers (job_id, base_pay_amount, target_bonus_percent, equity_amount,
        equity_vesting_years, equity_type, signing_bonus_amount, wellness_stipend_amount,
        other_amount, other_label, other_is_recurring, k401_match_percent,
        offer_deadline, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			data.job_id,
			data.base_pay_amount,
			data.target_bonus_percent,
			data.equity_amount,
			data.equity_vesting_years,
			data.equity_type,
			data.signing_bonus_amount,
			data.wellness_stipend_amount,
			data.other_amount,
			data.other_label,
			data.other_is_recurring ? 1 : 0,
			data.k401_match_percent,
			data.offer_deadline,
			data.notes,
		);
	return toClient(
		db.prepare("SELECT * FROM offers WHERE id = ?").get(result.lastInsertRowid) as OfferDbRow,
	);
}

export function updateOffer(
	db: Database.Database,
	jobId: number,
	data: OfferUpdateData,
): OfferRow | null {
	const info = db
		.prepare(
			`UPDATE offers SET
        base_pay_amount = ?, target_bonus_percent = ?, equity_amount = ?,
        equity_vesting_years = ?, equity_type = ?, signing_bonus_amount = ?,
        wellness_stipend_amount = ?, other_amount = ?, other_label = ?,
        other_is_recurring = ?, k401_match_percent = ?, offer_deadline = ?, notes = ?
      WHERE job_id = ?`,
		)
		.run(
			data.base_pay_amount,
			data.target_bonus_percent,
			data.equity_amount,
			data.equity_vesting_years,
			data.equity_type,
			data.signing_bonus_amount,
			data.wellness_stipend_amount,
			data.other_amount,
			data.other_label,
			data.other_is_recurring ? 1 : 0,
			data.k401_match_percent,
			data.offer_deadline,
			data.notes,
			jobId,
		);
	if (info.changes === 0) {return null;}
	return toClient(
		db.prepare("SELECT * FROM offers WHERE job_id = ?").get(jobId) as OfferDbRow,
	);
}

export function deleteOffer(
	db: Database.Database,
	jobId: number,
): boolean {
	return db
		.prepare("DELETE FROM offers WHERE job_id = ?")
		.run(jobId).changes > 0;
}

export function getOffersWithJobs(
	db: Database.Database,
	userId: number,
): { job: object; offer: OfferRow | null }[] {
	const rows = db
		.prepare(
			`SELECT j.id AS job_id, j.company, j.role, j.link, j.fit_score, j.salary,
              j.favorite, GROUP_CONCAT(jt.tag) AS tags_csv,
              CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END AS has_offer,
              o.id AS offer_id,
              o.base_pay_amount, o.target_bonus_percent, o.equity_amount,
              o.equity_vesting_years, o.equity_type, o.signing_bonus_amount,
              o.wellness_stipend_amount, o.other_amount, o.other_label,
              o.other_is_recurring, o.k401_match_percent, o.offer_deadline,
              o.notes AS offer_notes, o.created_at AS offer_created_at,
              o.updated_at AS offer_updated_at
       FROM jobs j
       LEFT JOIN offers o ON o.job_id = j.id
       LEFT JOIN job_tags jt ON jt.job_id = j.id
       WHERE j.user_id = ? AND j.status = 'offer'
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
		)
		.all(userId) as OfferWithJobRow[];

	return rows.map((r) => {
		const job = {
			id: r.job_id,
			company: r.company,
			role: r.role,
			link: r.link,
			fit_score: r.fit_score,
			salary: r.salary,
			favorite: Boolean(r.favorite),
			tags: r.tags_csv ? r.tags_csv.split(",") : [],
			has_offer: Boolean(r.has_offer),
		};
		const offer = r.offer_id != null
			? {
				id: r.offer_id,
				job_id: r.job_id,
				base_pay_amount: r.base_pay_amount,
				target_bonus_percent: r.target_bonus_percent,
				equity_amount: r.equity_amount,
				equity_vesting_years: r.equity_vesting_years ?? 4,
				equity_type: r.equity_type,
				signing_bonus_amount: r.signing_bonus_amount,
				wellness_stipend_amount: r.wellness_stipend_amount,
				other_amount: r.other_amount,
				other_label: r.other_label,
				other_is_recurring: Boolean(r.other_is_recurring),
				k401_match_percent: r.k401_match_percent,
				offer_deadline: r.offer_deadline,
				notes: r.offer_notes,
				created_at: r.offer_created_at as string,
				updated_at: r.offer_updated_at as string,
			}
			: null;
		return { job, offer };
	});
}
