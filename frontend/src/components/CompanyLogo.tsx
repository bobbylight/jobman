import React from "react";
import { Avatar } from "@mui/material";
import { useCompanyLogo } from "../useCompanyLogo";

interface Props {
	company: string;
	size?: number;
}

export default function CompanyLogo({ company, size = 20 }: Props) {
	const src = useCompanyLogo(company);
	return (
		<Avatar
			src={src ?? undefined}
			alt={company}
			data-testid="company-logo"
			sx={{ width: size, height: size, fontSize: size * 0.5, flexShrink: 0 }}
		>
			{company.charAt(0).toUpperCase()}
		</Avatar>
	);
}
