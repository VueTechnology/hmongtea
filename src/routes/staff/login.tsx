import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonClass, Page, Title } from "#/ui/site";

export const Route = createFileRoute("/staff/login")({
	head: () => ({ meta: [{ title: "Log in, hmongtea.com" }] }),
	component: StaffLogin,
	server: { handlers: { POST } },
});

async function POST({ request }: { request: Request }) {
	const { handlePost } = await import("#/server/actions");
	return handlePost(request);
}

function StaffLogin() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="Log in" />
			<p>Customers, partners, and staff use the same login.</p>
			<Link to="/login" className={buttonClass}>
				Log in
			</Link>
		</Page>
	);
}
