export function formatUserName(user = {}, fallback = "Người dùng") {
    if (!user || typeof user !== "object") {
        return fallback;
    }

    const lastName = String(
        user.LName || user.lastName || user.Customer_LName || user.Seller_LName || ""
    ).trim();
    const firstName = String(
        user.FName || user.firstName || user.Customer_FName || user.Seller_FName || ""
    ).trim();
    const fullName = [lastName, firstName].filter(Boolean).join(" ").trim();

    if (fullName) {
        return fullName;
    }

    const legacyName = String(user.Full_Name || user.fullName || "").trim();
    return legacyName || fallback;
}
