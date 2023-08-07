import { ApiContext } from "../../Api";
import { CircularProgress, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function IndexPage() {
	const api = useContext(ApiContext);
	const [currentAccount, setCurrentAccount] = useState<
		Account | undefined | null
	>(undefined);

	useEffect(() => {
		api.login
			.getCurrentAccount()
			.then((value) => setCurrentAccount(value || null));
	}, [api]);

	return currentAccount === undefined ? (
		<Stack
			alignItems="center"
			justifyContent="center"
			width="100%"
			height="100%"
		>
			<CircularProgress />
		</Stack>
	) : (
		<Navigate to={currentAccount === null ? "/login" : "/main"} />
	);
}
