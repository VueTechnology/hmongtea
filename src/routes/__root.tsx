import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { loadShell } from "#/server/fns";
import { Missing } from "#/ui/gate";
import { SiteFrame } from "#/ui/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "hmongtea.com" },
			{
				name: "description",
				content:
					"KuabCha loose-leaf green tea from the Golden Triangle foothills in Chiang Rai, Thailand.",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
		],
	}),
	loader: () => loadShell(),
	shellComponent: RootDocument,
	component: Frame,
	notFoundComponent: Missing,
});

function Frame() {
	return (
		<SiteFrame>
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
