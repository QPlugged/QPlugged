export default function getUidType(uid: string) {
    return uid.startsWith("u_") ? "user" : "group";
}
