import { createFileRoute } from "@tanstack/react-router";
import { loadDevMail } from "#/server/fns";
import { MailText } from "#/ui/mail";
import { Page, Title } from "#/ui/site";

export const Route = createFileRoute("/dev/mail")({
	head: () => ({ meta: [{ title: "Dev mail, hmongtea.com" }] }),
	loader: () => loadDevMail(),
	component: DevMail,
});

function DevMail() {
	const page = Route.useLoaderData();
	return (
		<Page>
			<Title eyebrow="Dev mail" title="Logged messages" />
			{page.demo ? (
				<p>Resend is off. Each message is stored here instead of being sent.</p>
			) : (
				<p>Resend is configured. This page stays empty.</p>
			)}
			{page.messages.length === 0 ? <p>No messages yet.</p> : null}
			<ul className="grid list-none gap-4 p-0">
				{page.messages.map((message) => (
					<li
						key={message.id}
						className="border border-line bg-paper p-4"
						data-testid="mail-message"
					>
						<p className="m-0 text-sm text-muted">
							{message.createdAt.slice(0, 16).replace("T", " ")}
						</p>
						<p className="m-0 mt-2">To {message.toEmail}</p>
						<h2
							className="mt-2 font-serif text-2xl font-medium"
							data-testid="mail-subject"
						>
							{message.subject}
						</h2>
						<MailText body={message.body} />
					</li>
				))}
			</ul>
		</Page>
	);
}
