export class LoginImpl implements Login {
    private nt: InternalApi;
    private business: InternalApi;
    private endpoint: Endpoint;
    constructor({ nt, business, endpoint }: InternalApis) {
        this.nt = nt;
        this.business = business;
        this.endpoint = endpoint;
    }
    async getAccountList(): Promise<LoginAccount[]> {
        const ret = await this.nt.send(
            "nodeIKernelLoginService/getLoginList",
            undefined,
            undefined,
        );
        if (ret.result !== 0)
            throw new Error(
                `nodeIKernelLoginService/getLoginList fails, ret: ${ret.result}`,
            );
        return (ret.LocalLoginInfoList as any[]).map((item) => {
            return {
                uin: item.uin,
                uid: item.uid,
                name: item.nickName,
                avatarURL: item.faceUrl,
                avatarFile: item.facePath,
                quickLoginSupported: item.isQuickLogin,
            };
        });
    }
    async getCurrentAccount(): Promise<Account | undefined> {
        const ret = await this.business.send("fetchAuthData");
        if (ret.uin && ret.uid)
            return {
                uin: ret.uin,
                uid: ret.uid,
            };
    }
    private parseLoginError(ret: any): LoginError | undefined {
        if (ret.result !== "0")
            return {
                type: ret.loginErrorInfo.proofWaterUrl
                    ? "captcha-required"
                    : "unknown",
                code: ret.result,
                url:
                    ret.loginErrorInfo.proofWaterUrl ||
                    ret.loginErrorInfo.jumpUrl ||
                    undefined,
                errorMsg:
                    ret.loginErrorInfo.errMsg ||
                    ret.loginErrorInfo.jumpWord ||
                    ret.loginErrorInfo.tipsContent,
            };
    }
    async loginWithUin(uin: string): Promise<LoginError | undefined> {
        const ret = await this.nt.send(
            "nodeIKernelLoginService/quickLoginWithUin",
            { uin: uin },
            undefined,
        );
        return this.parseLoginError(ret);
    }
    showLoginWindow(): Promise<void> {
        return this.endpoint.send({
            type: "show-login-window",
        });
    }
}
