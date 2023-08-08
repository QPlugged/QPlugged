import { ApiContext } from "../../Api";
import { Clear, Key } from "@mui/icons-material";
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { LogicalSize, getCurrent } from "@tauri-apps/plugin-window";
import { useContext, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const api = useContext(ApiContext);
    const navigate = useNavigate();
    const [loggingIn, setLoggingIn] = useState<boolean>(false);
    const [logInError, setLogInError] = useState<LoginError>();
    const logInErrorTitleId = useId();
    const logInErrorContentId = useId();
    const [accountList, setAccountList] = useState<LoginAccount[]>();

    const loginWithUin = async (uin: string) => {
        if (!api) throw new Error("未连接 API");
        setLoggingIn(true);
        const res = await api.login.loginWithUin(uin);
        if (res) {
            setLogInError(res);
            throw new Error(`登录失败：${JSON.stringify(res)}`);
        }
        navigate("/");
    };

    useEffect(() => {
        api.login
            .getAccountList()
            .then((value) =>
                setAccountList(
                    value.filter((account) => account.quickLoginSupported),
                ),
            );
    }, [api]);

    useEffect(() => {
        const win = getCurrent();
        win.setSize(new LogicalSize(700, 400));
        win.setResizable(false);
    }, []);

    return (
        <>
            <Dialog
                open={!!logInError}
                onClose={() => setLogInError(undefined)}
                aria-labelledby={logInErrorTitleId}
                aria-describedby={logInErrorContentId}
            >
                <DialogTitle id={logInErrorTitleId}>登录失败</DialogTitle>
                <DialogContent>
                    <DialogContentText id={logInErrorContentId}>
                        错误代码：{logInError?.code}
                        <br />
                        错误类型：{logInError?.type}
                        {logInError?.errorMsg && (
                            <>
                                <br />
                                错误信息：{logInError?.errorMsg}
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setLogInError(undefined)}
                        autoFocus
                        variant="contained"
                    >
                        关闭
                    </Button>
                </DialogActions>
            </Dialog>
            <Stack
                flex={1}
                direction={
                    useMediaQuery("(max-width: 600px)") ? "column" : "row"
                }
                alignItems="center"
                justifyContent="center"
                gap={4}
                padding={4}
                height="100%"
            >
                <Typography variant="h4" component="h1">
                    QPlugged
                </Typography>
                <Box
                    width="calc(100% - 20px)"
                    maxWidth={600}
                    bgcolor="background.paper"
                    boxShadow={1}
                    borderRadius={3}
                    overflow="auto"
                    maxHeight="100%"
                >
                    <List>
                        {accountList ? (
                            <>
                                {accountList.length !== 0 ? (
                                    accountList.map((account) => (
                                        <ListItem
                                            key={account.uid || account.uin}
                                            disablePadding
                                            secondaryAction={
                                                <IconButton
                                                    disabled={loggingIn}
                                                >
                                                    <Clear />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemButton
                                                disabled={loggingIn}
                                                onClick={() =>
                                                    loginWithUin(account.uin)
                                                }
                                            >
                                                <ListItemIcon>
                                                    <Avatar
                                                        src={account.avatar}
                                                        alt={account.name}
                                                        imgProps={{
                                                            draggable: false,
                                                        }}
                                                    >
                                                        {account.name.slice(
                                                            0,
                                                            1,
                                                        ) || null}
                                                    </Avatar>
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        account.name
                                                            ? `${account.name}`
                                                            : "未知"
                                                    }
                                                    secondary={account.uin}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem>
                                        <ListItemText secondary="此处暂时没有可以快速登录的账号。" />
                                    </ListItem>
                                )}
                                <ListItem disablePadding>
                                    <ListItemButton
                                        disabled={loggingIn}
                                        onClick={() =>
                                            api?.login.showLoginWindow()
                                        }
                                    >
                                        <ListItemIcon>
                                            <Key />
                                        </ListItemIcon>
                                        <ListItemText primary="添加账号" />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        ) : (
                            <ListItem>
                                <ListItemText secondary="加载中..." />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Stack>
        </>
    );
}
