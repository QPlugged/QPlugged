export default function getPromiseState(
    p: Promise<any>,
): Promise<"pending" | "fulfilled" | "rejected"> {
    const t = {};
    return Promise.race([p, t]).then(
        (v) => (v === t ? "pending" : "fulfilled"),
        () => "rejected",
    );
}
