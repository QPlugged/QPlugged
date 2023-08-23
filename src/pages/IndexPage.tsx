import { ApiContext } from "../Api";
import { CircularProgress, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function IndexPage() {
    const api = useContext(ApiContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        api.login.getCurrentAccount().then((account) => {
            setLoading(false);
            const isInLoginPage = location.pathname.startsWith("/login");
            const isInEmptyPage = location.pathname === "/";
            if (!account && !isInLoginPage) navigate("/login");
            else if (account && (isInEmptyPage || isInLoginPage))
                navigate("/main");
        });
    }, [api, location, navigate]);

    return loading ? (
        <Stack
            alignItems="center"
            justifyContent="center"
            width="100%"
            height="100%"
        >
            <CircularProgress />
        </Stack>
    ) : (
        <Outlet />
    );
}
