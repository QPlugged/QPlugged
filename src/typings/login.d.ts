declare interface Login {
	getAccountList(): Promise<LoginAccount[]>;
	getCurrentAccount(): Promise<Account | undefined>;
	loginWithUin(uin: string): Promise<LoginError | undefined>;
	showLoginWindow(): Promise<void>;
}

declare interface Account {
	uin: string;
	uid: string;
}

declare interface LoginAccount extends Account {
	name: string;
	avatar: string;
	quickLoginSupported: boolean;
}

declare interface LoginError {
	type: "captcha-required" | "mobile-confirmation-required" | "unknown";
	code: string;
	url?: string;
	errorMsg?: string;
}
