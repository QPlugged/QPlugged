type LoginEventEmitter = import("eventemitter3").EventEmitter<MainMessages>;

declare interface LoginEvents {
	"qrcode-update": (url: string) => void;
}

declare interface Login extends LoginEventEmitter {
	getAccountList(): Promise<LoginAccount[]>;
	loginWithUin(uin: string): Promise<LoginError | undefined>;
	showLoginWindow(): Promise<void>;
}

declare interface LoginAccount {
	uin: string;
	uid: string;
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
