import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import "./homepage.css";

export const metadata: Metadata = {
    title: "AI Destiny Calendar",
    description: "Lịch số học thông minh tích hợp AWS Bedrock",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}