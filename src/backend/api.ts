import { Ipc, IpcApi } from "./ipc";

export class InternalApi extends Ipc {
	public business: IpcApi;
	public nt: IpcApi;
	constructor(url: string) {
		super(url);
		this.business = this.useApi("BusinessApi");
		this.nt = this.useApi("ntApi", [
			"nodeIKernelLoginListener/onQRCodeGetPicture",
		]);
	}
}
