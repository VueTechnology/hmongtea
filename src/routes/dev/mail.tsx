import { createFileRoute } from "@tanstack/react-router";
import { loadMail } from "#/fn.ts";
import { formatWhen } from "#/domain/money.ts";
import { Eyebrow, Page } from "#/ui/site.tsx";

export const Route = createFileRoute("/dev/mail")({
	head: () => ({ meta: [{ title: "Dev mail | hmongtea.com" }] }),
	loader: () => loadMail(),
	component: MailPage,
});

function MailPage() {
	const data = Route.useLoaderData();
	return (
		<Page>
			<Eyebrow>Demo</Eyebrow>
			<h1 className="mt-3 font-serif text-5xl font-medium">Dev mail</h1>
			{data.mode === "resend" ? <p>Mail is going out through Resend. This page hides message bodies.</p> : <p>No Resend API key is set. Messages are logged here.</p>}
			<ul className="mt-6 grid gap-4" data-testid="mail-list">
				{data.messages.map((message) => (
					<li key={message.id} className="border border-line bg-paper p-4" data-testid="mail-message">
						<p className="m-0 text-sm text-muted">
							{message.to} · {formatWhen(message.createdAt)}
						</p>
						<p className="m-0 font-serif text-2xl">{message.subject}</p>
						<pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">{message.body}</pre>
					</li>
				))}
			</ul>
		</Page>
	);
}
