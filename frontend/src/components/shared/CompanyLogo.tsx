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
			sx={{ flexShrink: 0, fontSize: size * 0.5, height: size, width: size }}
		>
			{company.charAt(0).toUpperCase()}
		</Avatar>
	);
}
