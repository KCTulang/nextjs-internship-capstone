import { auth } from "@clerk/nextjs/server";
import DashboardLayout from "./dashboard-layout";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	await auth.protect();

	return <DashboardLayout>{children}</DashboardLayout>;
}
