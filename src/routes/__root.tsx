import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { loadShell } from "#/fn.ts";
import { SiteFrame } from "#/ui/site.tsx";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "hmongtea.com" },
			{ name: "description", content: "KuabCha loose-leaf green tea from the Golden Triangle foothills in Chiang Rai, Thailand." },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg" },
		],
	}),
	loader: () => loadShell(),
	shellComponent: RootDocument,
	component: Frame,
});

function Frame() {
	const shell = Route.useLoaderData();
	return (
		<SiteFrame cartCount={shell.cartCount} viewer={shell.viewer}>
			<Outlet />
		</SiteFrame>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
