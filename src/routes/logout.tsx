import { createFileRoute } from "@tanstack/react-router";
import { buttonClass, Csrf, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/logout")({
	head: () => ({ meta: [{ title: "Log out, hmongtea.com" }] }),
	component: Logout,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function Logout() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Log out" />
			<form method="post" action="/logout">
				<Csrf />
				<button className={buttonClass} type="submit">
					Log out
				</button>
			</form>
		</Page>
	);
}
