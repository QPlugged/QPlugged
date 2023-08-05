import { tauri } from "@tauri-apps/api";

export default function toURL(file?: string, url?: string) {
	return (file && tauri.convertFileSrc(file)) || url || "";
}
